// Execute the actual Edge Function source with only Deno/client boundaries mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const original='https://cartoon-universe-3.onrender.com';
const gateway='https://cartoon-universe-gateway.onrender.com';
let handler,state;
const environment={SITE_ORIGIN:original,SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fake-admin',SUPABASE_ANON_KEY:'fake-public'};
globalThis.Deno={env:{get:name=>environment[name]},serve:callback=>{handler=callback;}};
globalThis.__usernameTestClient=(url,key)=>{
 assert.equal(url,environment.SUPABASE_URL);state.clients++;
 if(key==='fake-admin')return {
  from(table){assert.equal(table,'profiles');return {select(){return this;},eq(_field,value){state.username=value;return this;},async maybeSingle(){return {data:state.missing?null:{id:'disposable-user'},error:null};}};},
  auth:{admin:{async getUserById(id){assert.equal(id,'disposable-user');return {data:{user:{email:'player@example.test'}},error:null};}}}
 };
 assert.equal(key,'fake-public');return {auth:{async signInWithPassword(credentials){state.credentials=credentials;return state.badPassword?{error:{message:'Authentication failed'},data:{}}:{error:null,data:{session:{access_token:'fake-access',refresh_token:'fake-refresh'}}};}}};
};
const path=new URL('../../supabase/functions/username-login/index.ts',import.meta.url);
const source=(await readFile(path,'utf8')).replace(/import \{ createClient \} from 'npm:@supabase\/supabase-js@2';/,"const createClient=(...args)=>globalThis.__usernameTestClient(...args);");
assert.doesNotMatch(source,/from 'npm:/);
const compiled=await transform(source,{loader:'ts',format:'esm'});await import('data:text/javascript;base64,'+Buffer.from(compiled.code).toString('base64'));
function reset(){state={clients:0};}
function request(origin,method='POST',body={username:'test_player',password:'disposable-password'}){return new Request('https://fixture.example/username-login',{method,headers:{...(origin?{Origin:origin}:{}),'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});}
test('original and gateway preflight use exact origins without invoking Auth',async()=>{
 for(const origin of [original,gateway]){reset();const response=await handler(request(origin,'OPTIONS'));assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(response.headers.get('Vary'),'Origin');assert.equal(state.clients,0);}
});
test('unapproved, lookalike and missing origins fail before privileged lookup',async()=>{
 for(const origin of [undefined,'https://untrusted.example',gateway+'.evil.example','http://cartoon-universe-gateway.onrender.com']){
  for(const method of ['POST','OPTIONS']){reset();const response=await handler(request(origin,method));assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);assert.equal(state.clients,0);}
 }
});
test('both allowed origins still require the supplied password before returning tokens',async()=>{
 for(const origin of [original,gateway]){reset();const response=await handler(request(origin));assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.deepEqual(state.credentials,{email:'player@example.test',password:'disposable-password'});assert.deepEqual(await response.json(),{access_token:'fake-access',refresh_token:'fake-refresh'});}
});
test('failed passwords and missing users return generic errors without tokens',async()=>{
 for(const option of ['badPassword','missing']){reset();state[option]=true;const response=await handler(request(gateway));assert.equal(response.status,401);assert.deepEqual(await response.json(),{error:'Invalid credentials'});}
});
test('invalid input and unsupported methods never invoke privileged lookup',async()=>{
 reset();assert.equal((await handler(request(gateway,'POST',{username:'invalid username',password:'x'}))).status,401);assert.equal(state.clients,0);
 assert.equal((await handler(request(gateway,'GET'))).status,405);assert.equal(state.clients,0);
});
