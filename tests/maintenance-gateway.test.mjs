import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {once} from 'node:events';
import {createGateway,stagingConfig} from '../server/maintenance-gateway.mjs';

const OWNER='00000000-0000-0000-0000-000000000002';
const PLAYER='00000000-0000-0000-0000-000000000001';
const env={STAGING_SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',STAGING_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_disposable_fixture',STAGING_SITE_ORIGIN:'http://127.0.0.1'};
async function fixture(t){
 const config=stagingConfig(env);
 const state={enabled:true,message:'Staging maintenance',owner:true,down:false,time:1000,calls:[]};
 const fetchImpl=async(url,options)=>{
  state.calls.push({url,options});
  if(state.down)throw new Error('Offline');
  const token=options.headers.Authorization;
  if(url.endsWith('/auth/v1/user'))return Response.json(token==='Bearer owner-token'?{id:OWNER}:token==='Bearer player-token'?{id:PLAYER}:token==='Bearer anonymous-token'?{id:OWNER,is_anonymous:true}:{},{status:token==='Bearer invalid-token'?401:200});
  if(url.includes('/owner_members?'))return Response.json(token==='Bearer owner-token'&&state.owner?[{user_id:OWNER}]:[]);
  if(url.includes('/site_maintenance?'))return Response.json(state.missing?[]:[{enabled:state.enabled,message:state.message}]);
  throw new Error('Unexpected API endpoint '+url);
 };
 const server=createGateway({config,fetchImpl,now:()=>state.time});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 config.siteOrigin=base;
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const get=(path,options={})=>fetch(base+path,options);
 const unlock=async(token='owner-token')=>{
  const response=await get('/__maintenance/session',{method:'POST',headers:{Origin:base,Authorization:'Bearer '+token}});
  return {response,cookie:response.headers.get('set-cookie')?.split(';')[0]};
 };
 return {state,get,unlock,base};
}

test('staging startup refuses production, secret keys, and unsafe origins',()=>{
 assert.throws(()=>stagingConfig({...env,STAGING_SUPABASE_URL:'https://gjfyemvcrgrthbrlqqnz.supabase.co'}),/Production/);
 assert.throws(()=>stagingConfig({...env,STAGING_SUPABASE_PUBLISHABLE_KEY:'sb_secret_no'}),/publishable/);
 for(const origin of ['http://example.com','https://example.com/path','https://user:pass@example.com'])
  assert.throws(()=>stagingConfig({...env,STAGING_SITE_ORIGIN:origin}));
});
test('maintenance ON blocks player pages, scripts, and artwork with noncacheable 503',async t=>{
 const {get}=await fixture(t);
 for(const path of ['/','/coin-wallet.html','/owner.html','/script.js','/static/cartoon-carnival.png','/index.html?owner=true']){
  const response=await get(path);assert.equal(response.status,503,path);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('retry-after'),'60');
 }
 const head=await get('/index.html',{method:'HEAD'});assert.equal(head.status,503);assert.equal(await head.text(),'');
});
test('owner login stays usable and uses only staging configuration',async t=>{
 const {get}=await fixture(t);
 const response=await get('/login.html');assert.equal(response.status,200);
 const html=await response.text();assert.match(html,/__maintenance\/bridge.js/);assert.doesNotMatch(html,/src="maintenance-notice.js"/);
 for(const path of ['/auth.js','/styles.css','/account.css','/theme.js','/__maintenance/bridge.js'])assert.equal((await get(path)).status,200,path);
 const config=await (await get('/config.js')).text();assert.match(config,/aaaaaaaaaaaaaaaaaaaa/);assert.doesNotMatch(config,/gjfyemvcrgrthbrlqqnz/);
});
test('OFF serves actual site files and rechecks state before subsequent requests',async t=>{
 const {state,get}=await fixture(t);state.enabled=false;
 const response=await get('/');assert.equal(response.status,200);assert.match(await response.text(),/CARTOON/i);
 state.enabled=true;assert.equal((await get('/')).status,503);
 assert.equal(state.calls.filter(c=>c.url.includes('site_maintenance')).length,2);
});
test('only a server-verified owner can establish a short-lived navigation cookie',async t=>{
 const {get,unlock,state}=await fixture(t);
 for(const token of ['player-token','invalid-token','anonymous-token','forged-owner-claims'])assert.equal((await unlock(token)).response.status,403,token);
 const {response,cookie}=await unlock();assert.equal(response.status,204);
 assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Max-Age=300/);
 assert.ok(!cookie.includes('owner-token'));
 assert.equal((await get('/owner.html',{headers:{Cookie:cookie}})).status,200);
 state.owner=false;
 assert.equal((await get('/owner.html',{headers:{Cookie:cookie}})).status,503);
});
test('expired or forged cookies cannot bypass the gate',async t=>{
 const {state,get,unlock}=await fixture(t);const {cookie}=await unlock();state.time+=300001;
 for(const value of [cookie,'cu_staging_owner=owner-token'])assert.equal((await get('/',{headers:{Cookie:value}})).status,503);
});
test('logout revokes the gateway cookie and session writes reject cross-origin requests',async t=>{
 const {get,unlock,base}=await fixture(t);const {cookie}=await unlock();
 assert.equal((await get('/__maintenance/session',{method:'POST',headers:{Origin:'https://other.test',Authorization:'Bearer owner-token'}})).status,403);
 assert.equal((await get('/__maintenance/session',{method:'POST',headers:{Authorization:'Bearer owner-token'}})).status,403);
 const response=await get('/__maintenance/session',{method:'DELETE',headers:{Origin:base,Cookie:cookie}});
 assert.equal(response.status,204);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal((await get('/',{headers:{Cookie:cookie}})).status,503);
});
test('missing state and upstream outages deny protected requests but preserve login',async t=>{
 const {state,get}=await fixture(t);state.missing=true;assert.equal((await get('/')).status,503);
 state.down=true;assert.equal((await get('/')).status,503);assert.equal((await get('/login.html')).status,200);
});
test('maintenance text is escaped and credentials are sent only to staging',async t=>{
 const {state,get,unlock}=await fixture(t);state.message='<script>alert("x")</script>';
 const html=await (await get('/')).text();assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
 await unlock();
 for(const call of state.calls){assert.ok(call.url.startsWith(env.STAGING_SUPABASE_URL+'/'));assert.equal(call.options.redirect,'error');}
});
test('repository internals and path tricks are never served even when maintenance is OFF',async t=>{
 const {state,get,base}=await fixture(t);state.enabled=false;
 for(const path of ['/supabase/schema.sql','/server/maintenance-gateway.mjs','/.git/config','/scripts/check-site.mjs'])assert.equal((await get(path)).status,404,path);
 for(const path of ['/../config.js','/%2e%2e/config.js','//index.html','/static\\cartoon-carnival.png']){
  const status=await new Promise((resolve,reject)=>{
   const req=request(base,{path},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();
  });
  assert.equal(status,400,path);
 }
});
