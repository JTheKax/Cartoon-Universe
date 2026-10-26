// Real disposable Supabase Auth/PostgREST/Postgres + Chromium. No cloud connection.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {createClient} from '@supabase/supabase-js';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createGateway,stagingConfig} from '../../server/maintenance-gateway.mjs';

if(process.env.GITHUB_ACTIONS!=='true')throw new Error('This disposable-container harness runs only in GitHub CI.');
const root=fileURLToPath(new URL('../..',import.meta.url));
const directory=await mkdtemp(join(tmpdir(),'cu-maintenance-local-'));
const network='cu-maintenance-local-'+process.pid;
const cleanEnv={...process.env};
for(const name of ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_PROJECT_ID','SUPABASE_PROJECT_REF'])delete cleanEnv[name];
const secrets=[];
const redact=text=>secrets.reduce((value,secret)=>secret?value.split(secret).join('[redacted]'):value,String(text))
 .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[redacted JWT]')
 .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g,'[redacted key]');
const cli=(args)=>{
 try{return execFileSync('supabase',[...args,'--workdir',directory],{env:cleanEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:600000,maxBuffer:20*1024*1024});}
 catch(error){throw new Error('Local Supabase '+args[0]+' failed: '+redact(error.stderr||error.message).slice(-4000));}
};
let server,browser,networkCreated=false;
const check=(condition,label)=>{if(!condition)throw new Error(label);};
try{
 console.log('Initializing an unlinked temporary Supabase directory.');
 cli(['init','--yes']);
 cli(['migration','new','local_maintenance_integration']);
 const migration=(await readdir(join(directory,'supabase/migrations'))).find(name=>name.endsWith('_local_maintenance_integration.sql'));
 check(migration,'CLI did not generate the local migration');
 const sources=['supabase/schema.sql','sql/tests/local_supabase_maintenance_fixture.sql','supabase/maintenance-daily-reward-guard.sql','supabase/maintenance-controls-review.sql'];
 const sql=(await Promise.all(sources.map(path=>readFile(join(root,path),'utf8')))).map(text=>text.replace(/^(?:begin|commit);\s*$/gm,'')).join('\n');
 await writeFile(join(directory,'supabase/migrations',migration),sql);
 execFileSync('docker',['network','create','-o','com.docker.network.bridge.host_binding_ipv4=127.0.0.1',network],{stdio:'pipe'});networkCreated=true;
 console.log('Starting local Auth, PostgREST, API gateway and PostgreSQL containers.');
 cli(['start','--network-id',network,'--exclude','realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor,mailpit']);
 const local=JSON.parse(cli(['status','-o','json']));
 const apiUrl=local.API_URL;
 check(apiUrl==='http://127.0.0.1:54321','Refusing a nonlocal API URL');
 const db=new URL(local.DB_URL);
 check(db.hostname==='127.0.0.1'&&db.port==='54322'&&db.pathname==='/postgres','Refusing a nonlocal database URL');
 const publicKey=local.PUBLISHABLE_KEY||local.ANON_KEY;
 const adminKey=local.SECRET_KEY||local.SERVICE_ROLE_KEY;
 secrets.push(publicKey,adminKey,decodeURIComponent(db.password));
 check(!!publicKey&&!!adminKey&&publicKey!==adminKey,'Missing separate local client/admin credentials');
 const psql=sql=>execFileSync('psql',['-X','-v','ON_ERROR_STOP=1','--host=127.0.0.1','--port=54322','--username=postgres','--dbname=postgres'],{
  input:sql,encoding:'utf8',stdio:['pipe','pipe','pipe'],env:{...cleanEnv,PGPASSWORD:decodeURIComponent(db.password)},timeout:20000
 });
 const admin=createClient(apiUrl,adminKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const password='A!'+randomBytes(24).toString('base64url');secrets.push(password);
 const accounts=[];
 for(const name of ['owner','player']){
  const email=name+'-'+randomBytes(6).toString('hex')+'@example.test';
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  check(!error&&data.user,'Could not create disposable '+name+' through local Auth');
  check(/^[0-9a-f-]{36}$/i.test(data.user.id),'Invalid local user identifier');
  accounts.push({id:data.user.id,email});
 }
 const [owner,player]=accounts;
 psql(`insert into public.owner_members(user_id) values('${owner.id}');
 insert into public.profiles(id,username,display_name) values('${owner.id}','test_owner','Local Owner'),('${player.id}','test_player','Local Player');
 insert into public.coin_wallets(user_id,balance) values('${owner.id}',500),('${player.id}',100);`);
 const client=()=>createClient(apiUrl,publicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const ownerClient=client(),playerClient=client();
 for(const [connection,account] of [[ownerClient,owner],[playerClient,player]]){
  const {error}=await connection.auth.signInWithPassword({email:account.email,password});
  check(!error,'Local Auth password sign-in failed');
 }
 console.log('Real local Supabase sign-in succeeded for disposable owner and player.');
 psql('update public.site_maintenance set enabled=true where id=true;');
 // Verify authenticated non-owner cannot read owner membership or another player's wallet.
 const {data:playerMembership,error:membershipError}=await playerClient.from('owner_members').select('user_id');
 check(!membershipError&&playerMembership.length===0,'Non-owner could read owner membership');
 const {data:visibleWallets,error:walletReadError}=await playerClient.from('coin_wallets').select('user_id,balance');
 check(!walletReadError&&visibleWallets.length===1&&visibleWallets[0].user_id===player.id,'Player wallet SELECT leaked another account');
 const {data:visibleClaims,error:claimReadError}=await playerClient.from('coin_daily_claims').select('user_id');
 check(!claimReadError&&visibleClaims.every(row=>row.user_id===player.id),'Player daily-claim SELECT leaked another account');
 const {data:visibleTransactions,error:transactionReadError}=await playerClient.from('coin_transactions').select('user_id');
 check(!transactionReadError&&visibleTransactions.every(row=>row.user_id===player.id),'Player transaction SELECT leaked another account');
 const {error:walletWriteError}=await playerClient.from('coin_wallets').update({balance:999999}).eq('user_id',player.id);
 check(walletWriteError?.code==='42501','Player wallet balance UPDATE was not denied');
 const {error:membershipWriteError}=await playerClient.from('owner_members').insert({user_id:player.id});
 check(membershipWriteError,'Non-owner was able to grant owner membership');
 console.log('Authenticated player ownership and wallet privilege checks passed.');
 const {data:before,error:readError}=await admin.from('coin_wallets').select('balance').eq('user_id',player.id).single();
 check(!readError&&before.balance===100,'Could not read disposable wallet');
 const blocked=await playerClient.rpc('claim_daily_cartoon_coins');
 check(blocked.error?.message==='Cartoon Universe is temporarily under maintenance','Local PostgREST allowed a blocked reward');
 const edit=await playerClient.from('profiles').update({display_name:'Blocked edit'}).eq('id',player.id).select('id');
 check(!edit.error&&edit.data.length===0,'Local profile UPDATE was not blocked');
 const upsert=await playerClient.from('profiles').upsert({id:player.id,username:'test_player',display_name:'Blocked upsert'});
 check(upsert.error?.code==='42501','Local profile UPSERT was not rejected');
 const ownerEdit=await ownerClient.from('profiles').update({display_name:'Verified Owner'}).eq('id',owner.id).select('id');
 check(!ownerEdit.error&&ownerEdit.data.length===1,'Owner self-edit was blocked');
 const crossEdit=await ownerClient.from('profiles').update({display_name:'Cross edit'}).eq('id',player.id).select('id');
 check(!crossEdit.error&&crossEdit.data.length===0,'Owner bypass expanded cross-player access');
 const ownerReward=await ownerClient.rpc('claim_daily_cartoon_coins');
 check(!ownerReward.error&&ownerReward.data.awarded===25,'Owner reward bypass failed');
 const {data:after}=await admin.from('coin_wallets').select('balance').eq('user_id',player.id).single();
 const {data:history}=await admin.from('coin_transactions').select('id').eq('user_id',player.id);
 const {data:claims}=await admin.from('coin_daily_claims').select('user_id').eq('user_id',player.id);
 const {data:profile}=await admin.from('profiles').select('display_name').eq('id',player.id).single();
 check(after?.balance===100&&history?.length===0&&claims?.length===0&&profile?.display_name==='Local Player','Blocked operations changed local player data');
 console.log('Real local PostgREST/RLS tests passed for maintenance ON and owner bypass.');
 const config=stagingConfig({STAGING_LOCAL_CONTAINERS:'true',STAGING_SUPABASE_URL:apiUrl,STAGING_SUPABASE_PUBLISHABLE_KEY:publicKey,STAGING_SITE_ORIGIN:'http://127.0.0.1'});
 server=createGateway({config});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;config.siteOrigin=base;
 const bundle=await build({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:resolve(root,'tests/browser')},bundle:true,write:false,format:'esm',platform:'browser'});
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext();
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(url==='https://esm.sh/@supabase/supabase-js@2')return route.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text});
  if(url.startsWith(base+'/')||url.startsWith(apiUrl+'/'))return route.continue();
  return route.abort();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 check((await page.goto(base+'/')).status()===503,'Anonymous browser bypassed maintenance');
 await page.getByRole('link',{name:'Owner sign-in',exact:true}).click();
 await page.locator('#login-email').fill(owner.email);await page.locator('#login-password').fill(password);
 await page.locator('#login button[type=submit]').click();
 await page.getByRole('link',{name:'Open staging owner dashboard'}).waitFor({state:'visible'});
 check((await context.cookies()).some(cookie=>cookie.name==='cu_staging_owner'&&cookie.httpOnly),'Owner browser did not receive its gateway cookie');
 await page.getByRole('link',{name:'Open staging owner dashboard'}).click();
 await page.locator('#owner-content').waitFor({state:'visible'});
 await page.goto(base+'/login.html');
 await page.getByRole('link',{name:'Open staging owner dashboard'}).waitFor({state:'visible'});
 await page.locator('#logout').click();
 await page.getByText('Staging gateway: sign in as owner to unlock protected pages.',{exact:true}).waitFor();
 check((await page.goto(base+'/owner.html')).status()===503,'Logged-out browser retained owner bypass');
 await page.goto(base+'/login.html');await page.locator('#login-email').fill(player.email);await page.locator('#login-password').fill(password);
 await page.locator('#login button[type=submit]').click();await page.locator('#account-panel').waitFor({state:'visible'});
 check((await page.goto(base+'/coin-wallet.html')).status()===503,'Signed-in player browser bypassed maintenance');
 assert.deepEqual(errors,[],'Uncaught browser errors with real local Supabase');
 psql('update public.site_maintenance set enabled=false where id=true;');
 const restored=await playerClient.rpc('claim_daily_cartoon_coins');
 check(!restored.error&&restored.data.awarded===25&&restored.data.balance===125,'Maintenance OFF failed to restore the reward');
 const restoredEdit=await playerClient.from('profiles').update({display_name:'Restored Player'}).eq('id',player.id).select('id');
 check(!restoredEdit.error&&restoredEdit.data.length===1,'Maintenance OFF failed to restore profile editing');
 check((await page.goto(base+'/coin-wallet.html')).status()===200,'Maintenance OFF failed to restore browser navigation');
 console.log('Real local Auth, browser owner login/logout, player denial, reward/profile enforcement and OFF recovery passed.');
}catch(error){
 console.error(redact(error.message));process.exitCode=1;
}finally{
 if(browser)await browser.close();
 if(server)await new Promise(resolve=>{server.closeAllConnections();server.close(resolve);});
 try{cli(['stop','--no-backup']);}catch{console.error('Local container cleanup did not complete; this runner is disposable.');}
 if(networkCreated)try{execFileSync('docker',['network','rm',network],{stdio:'pipe'});}catch{}
 await rm(directory,{recursive:true,force:true});
}
