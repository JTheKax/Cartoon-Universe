import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {productionConfig} from '../server/production-maintenance-gateway.mjs';
import {createGateway,stagingConfig} from '../server/maintenance-gateway.mjs';

const env={PRODUCTION_GATEWAY_ENABLED:'true',PRODUCTION_SUPABASE_URL:'https://gjfyemvcrgrthbrlqqnz.supabase.co',PRODUCTION_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_disposable_unit_test_key',PRODUCTION_SITE_ORIGIN:'https://cartoon-universe-gateway-candidate.onrender.com'};
test('production launch is disabled unless its separate switch is exactly true',()=>{
 for(const value of [undefined,'false','1','TRUE'])assert.throws(()=>productionConfig({...env,PRODUCTION_GATEWAY_ENABLED:value}),/disabled/);
});
test('production configuration requires the intended project and a publishable key',()=>{
 for(const url of ['https://aaaaaaaaaaaaaaaaaaaa.supabase.co','http://gjfyemvcrgrthbrlqqnz.supabase.co','https://gjfyemvcrgrthbrlqqnz.supabase.co/path'])
  assert.throws(()=>productionConfig({...env,PRODUCTION_SUPABASE_URL:url}));
 for(const key of ['sb_secret_disposable_test_key','legacy.jwt.key','sb_publishable_short'])assert.throws(()=>productionConfig({...env,PRODUCTION_SUPABASE_PUBLISHABLE_KEY:key}));
 const config=productionConfig(env);assert.equal(config.secure,true);assert.equal(config.mode,'production');
});
test('production origins must be concrete HTTPS website origins',()=>{
 for(const origin of ['http://example.com','https://127.0.0.1','https://[::1]','https://localhost','https://gateway.invalid','https://gateway.test','https://gateway.example','https://example.com:8443','https://user:pass@example.com','https://example.com/path','https://example.com?q=1','https://example.com#hash'])
  assert.throws(()=>productionConfig({...env,PRODUCTION_SITE_ORIGIN:origin}),undefined,origin);
});
test('the staging entry point still refuses production even when a production switch is present',()=>{
 assert.throws(()=>stagingConfig({...env,STAGING_SUPABASE_URL:env.PRODUCTION_SUPABASE_URL,STAGING_SUPABASE_PUBLISHABLE_KEY:env.PRODUCTION_SUPABASE_PUBLISHABLE_KEY,STAGING_SITE_ORIGIN:env.PRODUCTION_SITE_ORIGIN}),/Production is forbidden/);
});
test('production HTTP mode uses secure host cookies and performs verification reads only',async t=>{
 const config=productionConfig(env),calls=[];
 const user='00000000-0000-0000-0000-000000000002';
 // Every upstream call is intercepted here; this test never contacts production.
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/auth/v1/user'))return Response.json({id:user});
  if(url.includes('/owner_members?'))return Response.json([{user_id:user}]);
  if(url.includes('/site_maintenance?'))return Response.json([{enabled:true,message:'Maintenance'}]);
  throw new Error('Unexpected verification URL');
 };
 const server=createGateway({config,fetchImpl});server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/')).status,503);
 const response=await fetch(base+'/__maintenance/session',{method:'POST',headers:{Origin:config.siteOrigin,Authorization:'Bearer disposable-owner-token'}});
 assert.equal(response.status,204);
 const cookie=response.headers.get('set-cookie');
 assert.match(cookie,/^__Host-cu_owner=[0-9a-f]{64}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=300; Secure$/);
 assert.equal((await fetch(base+'/owner.html',{headers:{Cookie:cookie.split(';')[0]}})).status,200);
 const source=await (await fetch(base+'/config.js')).text();assert.match(source,/GATEWAY_MODE="production"/);assert.match(source,/GATEWAY_LABEL="Owner gateway"/);
 for(const call of calls){assert.equal(call.options.method||'GET','GET');assert.ok(call.url.startsWith(config.supabaseUrl+'/'));}
 const logout=await fetch(base+'/__maintenance/session',{method:'DELETE',headers:{Origin:config.siteOrigin,Cookie:cookie.split(';')[0]}});
 assert.match(logout.headers.get('set-cookie'),/Max-Age=0; Secure$/);
});
test('disabled production CLI exits before listening',()=>{
 const script=fileURLToPath(new URL('../server/production-maintenance-gateway.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[script],{env:{PRODUCTION_GATEWAY_ENABLED:'false'},encoding:'utf8',timeout:5000});
 assert.equal(result.status,1);assert.match(result.stderr,/startup is disabled/);assert.doesNotMatch(result.stdout,/listening/);
});
