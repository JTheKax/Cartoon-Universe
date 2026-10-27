import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createCandidateServer} from '../server/gateway-candidate.mjs';
import {createOwnerVerification} from '../server/owner-verification.mjs';
const origin='https://cartoon-universe-gateway.onrender.com';
const project='https://gjfyemvcrgrthbrlqqnz.supabase.co';
const key='sb_publishable_disposable_verification_key';
const owner='00000000-0000-0000-0000-000000000002',player='00000000-0000-0000-0000-000000000001';
async function fixture(t){
 const state={time:1000,member:true,calls:[]};
 const fetchImpl=async(url,options)=>{
  state.calls.push({url,options});const token=options.headers.Authorization;
  if(url.endsWith('/auth/v1/user'))return Response.json({id:['Bearer owner-token','Bearer alternate-owner-token'].includes(token)?owner:player});
  if(url.includes('/owner_members?'))return Response.json(['Bearer owner-token','Bearer alternate-owner-token'].includes(token)&&state.member?[{user_id:owner}]:[]);
  if(url.endsWith('/auth/v1/logout?scope=local'))return new Response(null,{status:204});
  throw new Error('Unexpected upstream path');
 };
 const server=createCandidateServer({origin,ownerVerification:{supabaseUrl:project,publishableKey:key},fetchImpl,now:()=>state.time});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const base='http://127.0.0.1:'+server.address().port;
 const verify=token=>fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token}});
 return {base,state,verify};
}
test('verification refuses privileged keys and unintended project URLs',()=>{
 assert.throws(()=>createOwnerVerification({origin,supabaseUrl:project,publishableKey:'sb_secret_test_key'}));
 assert.throws(()=>createOwnerVerification({origin,supabaseUrl:'https://other.supabase.co',publishableKey:key}));
});
test('owner page has strict password destination policy and exposes only public configuration',async t=>{
 const {base,state}=await fixture(t);const response=await fetch(base+'/__maintenance/owner-signin');assert.equal(response.status,200);
 assert.match(response.headers.get('content-security-policy'),/form-action 'none'/);assert.match(response.headers.get('content-security-policy'),/connect-src 'self' https:\/\/gjfyemvcrgrthbrlqqnz.supabase.co/);
 assert.match(await response.text(),/Verify owner sign-in/);assert.equal(state.calls.length,0);
 const config=await (await fetch(base+'/__maintenance/owner-verification-config.js')).text();assert.match(config,/sb_publishable_/);assert.doesNotMatch(config,/sb_secret_|service_role/);
});
test('nonowners and unverified claims cannot establish verification cookies',async t=>{
 const {base,verify}=await fixture(t);
 for(const token of ['player-token','forged-owner-metadata']){const response=await verify(token);assert.equal(response.status,403);assert.match(response.headers.get('set-cookie'),/Max-Age=0; Secure/);}
 assert.deepEqual(await (await fetch(base+'/__maintenance/owner-status')).json(),{ownerVerified:false,readOnly:true});
});
test('verified owner status uses a separate secure cookie and never unlocks the arcade',async t=>{
 const {base,state,verify}=await fixture(t);const response=await verify('owner-token');assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie');assert.match(cookie,/^__Host-cu_owner_verify=[0-9a-f]{64}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=300; Secure$/);
 const headers={Cookie:cookie.split(';')[0]};assert.deepEqual(await (await fetch(base+'/__maintenance/owner-status',{headers})).json(),{ownerVerified:true,readOnly:true});
 assert.equal((await fetch(base+'/owner.html',{headers})).status,503);
 assert.ok(state.calls.every(call=>call.options.method==='GET'));
 state.member=false;assert.equal((await (await fetch(base+'/__maintenance/owner-status',{headers})).json()).ownerVerified,false);
});
test('verification expires and clearing signs out only the verification session',async t=>{
 const {base,state,verify}=await fixture(t);let response=await verify('owner-token');let cookie=response.headers.get('set-cookie').split(';')[0];state.time+=300001;
 assert.equal((await (await fetch(base+'/__maintenance/owner-status',{headers:{Cookie:cookie}})).json()).ownerVerified,false);
 response=await verify('owner-token');cookie=response.headers.get('set-cookie').split(';')[0];
 const clear=await fetch(base+'/__maintenance/verify-session',{method:'DELETE',headers:{Origin:origin,Cookie:cookie}});assert.equal(clear.status,200);assert.match(clear.headers.get('set-cookie'),/Max-Age=0; Secure/);
 assert.deepEqual(state.calls.filter(call=>call.options.method==='POST').map(call=>call.url),[project+'/auth/v1/logout?scope=local']);
 assert.equal((await (await fetch(base+'/__maintenance/owner-status',{headers:{Cookie:cookie}})).json()).ownerVerified,false);
});
test('cross-origin requests and password bodies are rejected before verification',async t=>{
 const {base,state}=await fixture(t);
 assert.equal((await fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{Origin:'https://unapproved.example',Authorization:'Bearer owner-token'}})).status,403);
 assert.equal((await fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{Origin:origin},body:'password=not-accepted'})).status,400);assert.equal(state.calls.length,0);
});

test('replacing an owner verification session revokes the previous distinct token',async t=>{
 const {base,state,verify}=await fixture(t);
 const first=await verify('owner-token');assert.equal(first.status,200);
 const cookie=first.headers.get('set-cookie').split(';')[0];
 const second=await fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{Origin:origin,Authorization:'Bearer owner-token',Cookie:cookie}});
 assert.equal(second.status,200);
 assert.equal(state.calls.filter(call=>call.url.endsWith('/auth/v1/logout?scope=local')).length,0);
 const old=second.headers.get('set-cookie').split(';')[0];
 const third=await fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{Origin:origin,Authorization:'Bearer owner-token',Cookie:old}});
 assert.equal(third.status,200);
 assert.equal(state.calls.filter(call=>call.url.endsWith('/auth/v1/logout?scope=local')).length,0);
});

test('switching to a different owner token revokes the old token and invalidates old cookie',async t=>{
 const {base,state,verify}=await fixture(t);
 const first=await verify('owner-token');assert.equal(first.status,200);
 const oldCookie=first.headers.get('set-cookie').split(';')[0];
 const second=await fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{Origin:origin,Authorization:'Bearer alternate-owner-token',Cookie:oldCookie}});
 assert.equal(second.status,200);
 const logouts=state.calls.filter(call=>call.url.endsWith('/auth/v1/logout?scope=local'));
 assert.equal(logouts.length,1);
 assert.equal(logouts[0].options.headers.Authorization,'Bearer owner-token');
 assert.equal((await (await fetch(base+'/__maintenance/owner-status',{headers:{Cookie:oldCookie}})).json()).ownerVerified,false);
 const newCookie=second.headers.get('set-cookie').split(';')[0];
 assert.equal((await (await fetch(base+'/__maintenance/owner-status',{headers:{Cookie:newCookie}})).json()).ownerVerified,true);
});

test('arcade routes fail closed for anonymous and nonowner sessions',async t=>{
 const {base,verify}=await fixture(t);
 const anonymous=await fetch(base+'/__maintenance/arcade/');
 assert.equal(anonymous.status,503);
 const nonowner=await verify('player-token');
 assert.equal(nonowner.status,403);
 const cookie=nonowner.headers.get('set-cookie').split(';')[0];
 for(const path of ['/__maintenance/arcade/','/__maintenance/arcade/index.html','/index.html']){
  const response=await fetch(base+path,{headers:{Cookie:cookie}});
  assert.equal(response.status,503,path);
  assert.doesNotMatch(await response.text(),/Welcome to the arcade/);
 }
});

test('verified owner can load only allowlisted arcade assets; revocation closes access',async t=>{
 const {base,state,verify}=await fixture(t);
 const response=await verify('owner-token');assert.equal(response.status,200);
 const headers={Cookie:response.headers.get('set-cookie').split(';')[0]};
 const page=await fetch(base+'/__maintenance/arcade/',{headers});
 assert.equal(page.status,200);
 assert.match(page.headers.get('content-type'),/text\/html/);
 assert.match(page.headers.get('content-security-policy'),/media-src https: blob:/);
 assert.match(page.headers.get('content-security-policy'),/frame-src https:\/\/www\.youtube-nocookie\.com/);
 assert.match(await page.text(),/<base href="\/__maintenance\/arcade\/">/);
 for(const path of ['/__maintenance/arcade/server/gateway-candidate.mjs','/__maintenance/arcade/package.json','/__maintenance/arcade/%2e%2e/owner.html']){
  const denied=await fetch(base+path,{headers,redirect:'manual'});
  assert.notEqual(denied.status,200,path);
 }
 assert.equal((await fetch(base+'/index.html',{headers})).status,503);
 state.member=false;
 assert.equal((await fetch(base+'/__maintenance/arcade/',{headers})).status,503);
});
test('owner arcade session expires and cannot be reused after logout',async t=>{
 const {base,state,verify}=await fixture(t);
 const response=await verify('owner-token');
 const headers={Cookie:response.headers.get('set-cookie').split(';')[0]};
 state.time+=300001;
 assert.equal((await fetch(base+'/__maintenance/arcade/',{headers})).status,503);
 state.time=1000;
 const again=await verify('owner-token');
 const fresh={Cookie:again.headers.get('set-cookie').split(';')[0]};
 assert.equal((await fetch(base+'/__maintenance/arcade/',{headers:fresh})).status,200);
 await fetch(base+'/__maintenance/verify-session',{method:'DELETE',headers:{...fresh,Origin:origin}});
 assert.equal((await fetch(base+'/__maintenance/arcade/',{headers:fresh})).status,503);
});

test('owner arcade homepage assets resolve only through the protected route',async t=>{
 const {base,verify}=await fixture(t);
 const response=await verify('owner-token');
 assert.equal(response.status,200);
 const headers={Cookie:response.headers.get('set-cookie').split(';')[0]};
 const page=await fetch(base+'/__maintenance/arcade/',{headers});
 assert.equal(page.status,200);
 const html=await page.text();
 const baseHref=html.match(/<base href="([^"]+)"/)?.[1];
 assert.equal(baseHref,'/__maintenance/arcade/');
 const assets=[...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)]
  .map(match=>match[1]).filter(url=>!url.startsWith('#')&&!/^https?:/.test(url));
 assert.ok(assets.length>=5,'Expected homepage scripts and stylesheet');
 for(const asset of assets){
  const url=new URL(asset,new URL(baseHref,base));
  assert.ok(url.pathname.startsWith('/__maintenance/arcade/'),asset);
  const allowed=await fetch(url,{headers});
  assert.equal(allowed.status,200,'Owner asset: '+asset);
  const blocked=await fetch(url);
  assert.equal(blocked.status,503,'Anonymous asset: '+asset);
 }
 const signin=await (await fetch(base+'/__maintenance/owner-signin')).text();
 assert.match(signin,/id="arcade-entry" hidden/);
 assert.doesNotMatch(signin,/cartoon-universe-3\.onrender\.com/);
 const client=await (await fetch(base+'/__maintenance/owner-verification.js')).text();
 assert.match(client,/getElementById\('arcade-entry'\)\.hidden=!verified/);
});


test('verified owner can open standalone theater without exposing assets to anonymous visitors',async t=>{
 const {base,verify}=await fixture(t);
 assert.equal((await fetch(base+'/__maintenance/arcade/static/theater.html')).status,503);
 const response=await verify('owner-token');assert.equal(response.status,200);
 const headers={Cookie:response.headers.get('set-cookie').split(';')[0]};
 const page=await fetch(base+'/__maintenance/arcade/static/theater.html',{headers});
 assert.equal(page.status,200);
 const html=await page.text();
 assert.ok(html.includes('<base href="/__maintenance/arcade/">'));
 for(const asset of ['styles.css','theater.js','index.html']){
  assert.ok(html.includes('href="'+asset+'"')||html.includes('src="'+asset+'"'),asset);
  const path='/__maintenance/arcade/'+asset;
  assert.equal((await fetch(base+path,{headers})).status,200,path);
  assert.equal((await fetch(base+path)).status,503,path);
  assert.ok(!html.includes('="../'+asset+'"'),'Escaping protected prefix: '+asset);
 }
});
