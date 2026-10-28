import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {publicGatewayConfig,createPublicGateway} from '../server/public-launch-gateway.mjs';
const env={
 PUBLIC_GATEWAY_LAUNCH_MODE:'enabled',
 PRODUCTION_SUPABASE_URL:'https://gjfyemvcrgrthbrlqqnz.supabase.co',
 PRODUCTION_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_disposable_mock_key_123456789',
 PRODUCTION_SITE_ORIGIN:'https://cartoon-universe-gateway.onrender.com'
};
const uid='00000000-0000-0000-0000-000000000002';
async function fixture(t,{enabled=true,fail=false,member=true}={}){
 const calls=[];
 let state=enabled;
 const fetchImpl=async(url,options={})=>{
  calls.push({url,options});
  if(fail)throw Error('Upstream unavailable');
  if(url.includes('/site_maintenance?'))return Response.json([{enabled:state,message:'Maintenance <script>unsafe</script>'}]);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:uid,is_anonymous:false});
  if(url.includes('/owner_members?'))return Response.json(member?[{user_id:uid}]:[]);
  throw Error('Unexpected upstream request: '+url);
 };
 const config=publicGatewayConfig(env);
 const server=createPublicGateway({config,fetchImpl});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 return {base:'http://127.0.0.1:'+server.address().port,config,calls,setMaintenance:value=>{state=value;}};
}
test('entrypoint refuses candidate mode, missing opt-in, foreign project, and secret keys',()=>{
 for(const mode of [undefined,'false','true','production'])
  assert.throws(()=>publicGatewayConfig({...env,PUBLIC_GATEWAY_LAUNCH_MODE:mode}));
 assert.throws(()=>publicGatewayConfig({...env,GATEWAY_CANDIDATE_MODE:'true'}));
 assert.throws(()=>publicGatewayConfig({...env,PRODUCTION_SUPABASE_URL:'https://other.supabase.co'}));
 for(const key of ['sb_secret_disposable_key','legacy.jwt.key','sb_publishable_short'])
  assert.throws(()=>publicGatewayConfig({...env,PRODUCTION_SUPABASE_PUBLISHABLE_KEY:key}));
 assert.throws(()=>publicGatewayConfig({...env,PRODUCTION_SITE_ORIGIN:'http://example.com'}));
});
test('disabled CLI exits without opening a public port',()=>{
 const script=fileURLToPath(new URL('../server/public-launch-gateway.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[script],{env:{...env,PUBLIC_GATEWAY_LAUNCH_MODE:'disabled'},encoding:'utf8',timeout:5000});
 assert.equal(result.status,1);assert.match(result.stderr,/Separate public gateway is disabled/);
 assert.doesNotMatch(result.stdout,/listening/);
});
test('maintenance blocks public HTML, assets and scripts; owner routes stay protected',async t=>{
 const {base,calls}=await fixture(t);
 for(const path of ['/','/login.html','/coin-wallet.html','/static/theater.html','/static/dark-side-ring-blue-cover.svg','/sticker-catalog.json']){
  const response=await fetch(base+path);
  assert.equal(response.status,503,path);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('retry-after'),'60');
  const body=await response.text();
  assert.match(body,/Under Maintenance/);
  assert.doesNotMatch(body,/<script>unsafe<\/script>/);
 }
 assert.equal((await fetch(base+'/owner.html')).status,403);
 assert.equal((await fetch(base+'/__maintenance/arcade/')).status,403);
 assert.equal((await fetch(base+'/__maintenance/owner-signin')).status,200);
 assert.equal((await fetch(base+'/__maintenance/password-recovery')).status,200);
 assert.equal((await fetch(base+'/__maintenance/health')).status,200);
 assert.ok(calls.every(call=>call.url.startsWith(env.PRODUCTION_SUPABASE_URL)));
 assert.ok(calls.every(call=>(call.options.method||'GET')==='GET'));
});
test('upstream failure fails closed and never publishes public files',async t=>{
 const {base}=await fixture(t,{enabled:false,fail:true});
 assert.equal((await fetch(base+'/')).status,503);
 assert.equal((await fetch(base+'/shop-shop.html')).status,503);
 assert.equal((await fetch(base+'/__maintenance/arcade/')).status,403);
});
test('maintenance off opens allowlisted public pages but never owner dashboard',async t=>{
 const {base}=await fixture(t,{enabled:false});
 for(const path of ['/','/login.html','/coin-wallet.html','/static/theater.html','/static/theater.js','/static/dark-side-ring-blue-cover.svg','/sticker-catalog.json']){
  const response=await fetch(base+path);
  assert.equal(response.status,200,path);
  assert.equal(response.headers.get('cache-control'),'no-store');
 }
 for(const path of ['/owner.html','/owner.js','/owner-theater.js','/maintenance-controls.js'])
  assert.equal((await fetch(base+path)).status,403,path);
 for(const path of ['/server/public-launch-gateway.mjs','/sql/tests/ci_bootstrap.sql','/.env','/package.json'])
  assert.equal((await fetch(base+path)).status,404,path);
 for(const path of ['/../server/owner-verification.mjs','/%2e%2e/server','//owner.html','/static/../owner.html'])
  assert.notEqual((await fetch(base+path,{redirect:'manual'})).status,200,path);
 assert.equal((await fetch(base+'/owner.html',{method:'POST'})).status,405);
 assert.equal((await fetch(base+'/',{method:'HEAD'})).status,200);
});
test('owner cookie unlocks protected arcade only after server-side membership check',async t=>{
 const {base,config,setMaintenance}=await fixture(t,{enabled:true});
 const invalid=await fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{Origin:'https://attacker.example',Authorization:'Bearer mock-owner-token'}});
 assert.equal(invalid.status,403);
 const response=await fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{Origin:config.origin,Authorization:'Bearer mock-owner-token'}});
 assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie');
 assert.match(cookie,/^__Host-cu_owner_verify=[0-9a-f]{64}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=300; Secure$/);
 const headers={Cookie:cookie.split(';')[0]};
 for(const path of ['/__maintenance/arcade/','/__maintenance/arcade/owner.html','/__maintenance/arcade/owner-theater.js','/__maintenance/arcade/static/theater.html','/__maintenance/arcade/static/dark-side-ring-blue-cover.svg']){
  const r=await fetch(base+path,{headers});
  assert.equal(r.status,200,path);
 }
 assert.equal((await fetch(base+'/',{headers})).status,503,'public entry remains maintenance gated');
 setMaintenance(false);
 assert.equal((await fetch(base+'/owner.html',{headers})).status,200);
 const logout=await fetch(base+'/__maintenance/verify-session',{method:'DELETE',headers:{...headers,Origin:config.origin}});
 assert.equal(logout.status,200);
 assert.equal((await fetch(base+'/owner.html',{headers})).status,403);
});
test('nonowner access token never opens protected pages',async t=>{
 const {base,config}=await fixture(t,{enabled:false,member:false});
 const r=await fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{Origin:config.origin,Authorization:'Bearer mock-player-token'}});
 assert.equal(r.status,403);
 assert.equal((await fetch(base+'/owner.html')).status,403);
});
