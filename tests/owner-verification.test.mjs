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


test('on-demand Cartoon Theater and DVD shelf are owner-protected during maintenance',async t=>{
 const {base,verify}=await fixture(t);
 const anonymous=await fetch(base+'/__maintenance/arcade/static/theater.html');
 assert.equal(anonymous.status,503);
 const response=await verify('owner-token');
 assert.equal(response.status,200);
 const headers={Cookie:response.headers.get('set-cookie').split(';')[0]};
 const theater=await fetch(base+'/__maintenance/arcade/static/theater.html',{headers});
 assert.equal(theater.status,200);
 const html=await theater.text();
 assert.match(html,/<base href="\/__maintenance\/arcade\/static\/">/);
 assert.match(html,/class="dvd-shelf"/);
 assert.match(html,/src="theater\.js"/);
 assert.match(html,/href="\.\.\/styles\.css"/);
 const script=await fetch(base+'/__maintenance/arcade/static/theater.js',{headers});
 assert.equal(script.status,200);
 const js=await script.text();
 assert.match(js,/DVD shelf preview selection/);
 assert.doesNotMatch(js,/setInterval\(render/);
 assert.equal((await fetch(base+'/__maintenance/arcade/static/theater.js')).status,503);
 const owner=await (await fetch(base+'/__maintenance/arcade/owner.html',{headers})).text();
 assert.match(owner,/Open Theater Preview/);
 const homepage=await (await fetch(base+'/__maintenance/arcade/',{headers})).text();
 assert.match(homepage,/Visit Movie Theater/);
});


test('every reviewed shop and Watch page is reachable only by verified owners during maintenance',async t=>{
 const {base,verify}=await fixture(t);
 const response=await verify('owner-token');
 assert.equal(response.status,200);
 const headers={Cookie:response.headers.get('set-cookie').split(';')[0]};
 const pages=["shop-auctions.html","shop-cards-battle.html","shop-cards-deck-build.html","shop-cards.html","shop-collect-encyclopedia.html","shop-collect-my-collection.html","shop-collect-my-scene.html","shop-collect-wishlist.html","shop-collect.html","shop-collectibles.html","shop-community-forums.html","shop-community-help.html","shop-community-support.html","shop-community.html","shop-games-arcade.html","shop-games-claw-machine.html","shop-games-monster-catcher.html","shop-games-prize-wheel.html","shop-games-retro-games.html","shop-games.html","shop-my-shop.html","shop-packs.html","shop-recycler.html","shop-shop.html","shop-watch-anime.html","shop-watch-cartoons.html","shop-watch-misc.html","shop-watch-movies.html","shop-watch.html"];
 for(const page of pages){
  const url=base+'/__maintenance/arcade/'+page;
  const ownerPage=await fetch(url,{headers});
  assert.equal(ownerPage.status,200,'Protected owner route: '+page);
  assert.match(ownerPage.headers.get('content-type'),/text\/html/);
  const denied=await fetch(url);
  assert.equal(denied.status,503,'Anonymous route denied: '+page);
 }
});

test('owner can load external shop controllers and public sticker catalog, anonymous users cannot',async t=>{
 const {base,verify}=await fixture(t);
 const verified=await verify('owner-token');
 assert.equal(verified.status,200);
 const headers={Cookie:verified.headers.get('set-cookie').split(';')[0]};
 const files=['nav-account-controls.js','account-redirect.js','shop-collect-controller.js','shop-inventory-controller.js','shop-local-movie.js','sticker-catalog.json','assets/appearance-catalog.json'];
 for(const name of files){
  const url=base+'/__maintenance/arcade/'+name;
  const allowed=await fetch(url,{headers});
  assert.equal(allowed.status,200,'Owner should load '+name);
  assert.match(allowed.headers.get('content-type'),name.endsWith('.json')?/application\/json/:/text\/javascript/);
  assert.equal((await fetch(url)).status,503,'Anonymous user should not load '+name);
 }
});
