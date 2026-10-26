import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createCandidateServer} from './gateway-candidate.mjs';
const origin='https://cartoon-universe-gateway.onrender.com';
const user='11111111-1111-4111-8111-111111111111';
const key='sb_publishable_'+'x'.repeat(40);
const fetchImpl=async(url)=>{
 if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:user,is_anonymous:false}),{status:200});
 if(url.includes('/rest/v1/owner_members?'))return new Response(JSON.stringify([{user_id:user}]),{status:200});
 return new Response('{}',{status:200});
};
test('authenticated owner sees read-only settings, regular player denied, POST blocked',async()=>{
 const server=createCandidateServer({
  origin,fetchImpl,
  ownerVerification:{supabaseUrl:'https://gjfyemvcrgrthbrlqqnz.supabase.co',publishableKey:key},
  maintenanceSettingsPreview:{readRoutingState:async()=>({routingConfirmed:true,masterMaintenance:false,routeStates:{home:'live',arcade:'maintenance'}})}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const path='/__maintenance/owner/settings-preview';
  assert.equal((await fetch(base+path)).status,403);
  const verified=await fetch(base+'/__maintenance/verify-session',{method:'POST',headers:{origin,authorization:'Bearer test-owner-token'}});
  assert.equal(verified.status,200);
  const cookie=verified.headers.get('set-cookie').split(';')[0];
  const owner=await fetch(base+path,{headers:{cookie}});
  assert.equal(owner.status,200);
  const data=await owner.json();
  assert.equal(data.readOnly,true);
  assert.equal(data.features.find(f=>f.id==='home').status,'LIVE');
  assert.equal(data.features.find(f=>f.id==='arcade').status,'MAINTENANCE');
  assert.equal((await fetch(base+path,{method:'POST',headers:{cookie}})).status,405);
  assert.equal((await fetch(base+path,{headers:{cookie:'__Host-cu_owner_verify=invalid'}})).status,403);
 }finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
});
