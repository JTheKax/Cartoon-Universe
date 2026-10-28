import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const clientSource=readFileSync(new URL('../server/owner-verification-client.js',import.meta.url),'utf8')
 .replace(/^import .*;\s*$/gm,'')
 // Replace the browser-only ESM import with a deterministic asynchronous test
 // dependency. The real client still loads the official Supabase SDK.
 .replace("await import('https://esm.sh/@supabase/supabase-js@2')","Promise.resolve({createClient:globalThis.__fixtureCreateClient})");

async function fixture({username=false,owner=true,deleteFails=false}={}){
 const handlers=new Map(),calls=[],authCalls=[],events=[];
 const names=['verify-form','status','clear','verify','password','identifier','arcade-entry'];
 const elements=Object.fromEntries(names.map(name=>[name,{
  hidden:false,disabled:false,value:'',textContent:'',
  addEventListener(event,handler){handlers.set(name+':'+event,handler);}
 }]));
 elements.identifier.value=username?'JTheKax':'owner@example.com';
 elements.password.value='not-a-real-password';
 let verified=false;
 const session={access_token:'owner-token'};
 const auth={
  async signInWithPassword(credentials){authCalls.push(['email',credentials.email]);return {data:{session},error:null};},
  async setSession(tokens){authCalls.push(['username',tokens]);return {data:{session},error:null};},
  async signOut(){authCalls.push(['signout']);events.push('browser-signout');return {error:null};}
 };
 let options;
 const createClient=(_url,_key,config)=>{options=config;return {auth};};
 const fetch=async(url,init={})=>{
  calls.push({url,init});
  if(url==='/__maintenance/owner-status')return {ok:true,json:async()=>({ownerVerified:verified})};
  if(url.endsWith('/functions/v1/username-login'))return {ok:true,json:async()=>({access_token:'owner-token',refresh_token:'refresh-token'})};
  if(url==='/__maintenance/verify-session'&&init.method==='POST'){
   if(!owner)return {ok:false};
   verified=true;return {ok:true};
  }
  if(url==='/__maintenance/verify-session'&&init.method==='DELETE'){events.push('gateway-delete');if(deleteFails)return {ok:false};verified=false;return {ok:true};}
  throw new Error('Unexpected test request: '+url);
 };
 runInNewContext(clientSource,{__fixtureCreateClient:createClient,SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_KEY:'sb_publishable_fixture',document:{getElementById:name=>elements[name]},fetch});
 await new Promise(resolve=>setImmediate(resolve));
 const submit=()=>handlers.get('verify-form:submit')({preventDefault(){}});
 const clear=()=>handlers.get('clear:click')();
 return {submit,clear,options,elements,calls,authCalls,events};
}

test('email owner login establishes both a persistent browser session and protected cookie',async()=>{
 const f=await fixture();
 assert.equal(f.options.auth.persistSession,true);
 await f.submit();
 assert.ok(f.authCalls.some(x=>x[0]==='email'));
 assert.ok(f.calls.some(x=>x.url==='/__maintenance/verify-session'&&x.init.headers.Authorization==='Bearer owner-token'));
 assert.equal(f.elements['arcade-entry'].hidden,false);
 await f.clear();
 assert.ok(f.authCalls.some(x=>x[0]==='signout'));
 assert.deepEqual(f.events.slice(-2),['gateway-delete','browser-signout']);
 assert.equal(f.elements['arcade-entry'].hidden,true);
});

test('username owner login stores the refresh token in the official Supabase client',async()=>{
 const f=await fixture({username:true});
 await f.submit();
 assert.ok(f.authCalls.some(x=>x[0]==='username'&&x[1].refresh_token==='refresh-token'));
 assert.equal(f.elements['arcade-entry'].hidden,false);
});

test('nonowner verification failure clears the browser session and denies arcade entry',async()=>{
 const f=await fixture({owner:false});
 await f.submit();
 assert.ok(f.authCalls.some(x=>x[0]==='signout'));
 assert.equal(f.elements['arcade-entry'].hidden,true);
 assert.match(f.elements.status.textContent,/Owner access could not be verified/);
});

test('failed gateway cookie revocation prevents misleading owner logout',async()=>{
 const f=await fixture({deleteFails:true});
 await f.submit();
 await f.clear();
 assert.deepEqual(f.events,['gateway-delete']);
 assert.equal(f.authCalls.some(x=>x[0]==='signout'),false);
 assert.match(f.elements.status.textContent,/Unable to clear verification/);
});

const navSource=readFileSync(new URL('../nav-account-controls.js',import.meta.url),'utf8')
 .replace(/^import .*;\s*$/gm,'');

async function navLogoutFixture({path='/__maintenance/arcade/',deleteFails=false}={}){
 const events=[],alerts=[],handlers=new Map();
 const names=['nav-player-name','nav-player-balance','nav-owner-badge','nav-owner-tab','nav-login-link','nav-logout-button','nav-register-link'];
 const elements=Object.fromEntries(names.map(name=>[name,{
  hidden:false,disabled:false,textContent:'',
  addEventListener(event,handler){handlers.set(name+':'+event,handler);}
 }]));
 const auth={
  async getSession(){return {data:{session:null}};},
  onAuthStateChange(){},
  async signOut(){events.push('browser-signout');return {error:null};}
 };
 const fetch=async(url,init)=>{
  if(url!=='/__maintenance/verify-session'||init.method!=='DELETE')throw new Error('Unexpected request');
  events.push('gateway-delete');return {ok:!deleteFails};
 };
 runInNewContext(navSource,{
  document:{getElementById:name=>elements[name]},
  window:{addEventListener(){}},
  location:{pathname:path},
  fetch,createClient:()=>({auth}),SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_ANON_KEY:'sb_publishable_fixture',
  alert:message=>alerts.push(message),setTimeout
 });
 await new Promise(resolve=>setImmediate(resolve));
 return {logout:()=>handlers.get('nav-logout-button:click')(),events,alerts,elements};
}

test('navigation logout clears protected owner cookie before browser sign-out',async()=>{
 const f=await navLogoutFixture();
 await f.logout();
 assert.deepEqual(f.events,['gateway-delete','browser-signout']);
 assert.equal(f.alerts.length,0);
});

test('navigation logout fails closed when owner cookie cannot be revoked',async()=>{
 const f=await navLogoutFixture({deleteFails:true});
 await f.logout();
 assert.deepEqual(f.events,['gateway-delete']);
 assert.equal(f.alerts.length,1);
});

test('normal public navigation logout does not call owner gateway',async()=>{
 const f=await navLogoutFixture({path:'/'});
 await f.logout();
 assert.deepEqual(f.events,['browser-signout']);
});

test('navigation logout revokes owner cookie on slashless arcade root',async()=>{
 const f=await navLogoutFixture({path:'/__maintenance/arcade'});
 await f.logout();
 assert.deepEqual(f.events,['gateway-delete','browser-signout']);
 assert.equal(f.alerts.length,0);
});

test('account logout guard includes both canonical and slashless protected arcade roots',()=>{
 const authSource=readFileSync(new URL('../auth.js',import.meta.url),'utf8');
 for(const source of [authSource,navSource]){
  assert.match(source,/location\.pathname!=='\/__maintenance\/arcade'/,'Slashless arcade root must be protected');
  assert.match(source,/location\.pathname\.startsWith\('\/__maintenance\/arcade\/'\)/,'Nested protected arcade paths must be protected');
 }
});
