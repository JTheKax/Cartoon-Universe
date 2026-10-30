import test from 'node:test';
import assert from 'node:assert/strict';
import {createSectionMaintenanceSupabaseWriter} from '../server/section-maintenance-supabase-writer.mjs';
import {createSectionMaintenanceApi} from '../server/section-maintenance-api.mjs';
const origin='https://example.test';
const publishableKey='sb_publishable_disposable_test_key_123456';
const accessToken='mock_verified_server_token_1234567890';
const change={section:'radio',maintenanceEnabled:false,ownerId:'owner-uuid',accessToken};
const response=body=>({ok:true,json:async()=>body});

test('only server-verified owner token is forwarded to authenticated audited RPC',async()=>{
 const calls=[];
 const writer=createSectionMaintenanceSupabaseWriter({supabaseUrl:origin,publishableKey,fetchImpl:async(url,options)=>{
  calls.push({url,options});
  return response({saved:true,audited:true,section:'radio',maintenanceEnabled:false});
 }});
 const api=createSectionMaintenanceApi({origin,verifyOwner:async()=>({verified:true,userId:'owner-uuid',accessToken}),saveChange:writer});
 const result=await api({method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({section:'radio',maintenanceEnabled:false})});
 assert.equal(result.status,200);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,origin+'/rest/v1/rpc/set_section_maintenance');
 assert.equal(calls[0].options.method,'POST');
 assert.equal(calls[0].options.headers.Authorization,'Bearer '+accessToken);
 assert.equal(calls[0].options.headers.apikey,publishableKey);
 assert.deepEqual(JSON.parse(calls[0].options.body),{p_section:'radio',p_enabled:false});
 assert.ok(!calls[0].options.body.includes('owner-uuid'));
});
test('missing owner token and invalid changes never reach the RPC',async()=>{
 let calls=0;
 const writer=createSectionMaintenanceSupabaseWriter({supabaseUrl:origin,publishableKey,fetchImpl:async()=>{calls++;return response({saved:true,audited:true,section:'radio',maintenanceEnabled:false});}});
 for(const invalid of [{...change,accessToken:undefined},{...change,section:'unknown'},{...change,maintenanceEnabled:'false'},{...change,ownerId:''}])
  await assert.rejects(writer(invalid));
 assert.equal(calls,0);
});
test('RPC outage, missing audit, or mismatched acknowledgement fail closed',async()=>{
 for(const fetchImpl of [
  async()=>{throw Error('offline');},
  async()=>({ok:false}),
  async()=>response({saved:true,audited:false,section:'radio',maintenanceEnabled:false}),
  async()=>response({saved:true,audited:true,section:'home',maintenanceEnabled:false})
 ]){
  const writer=createSectionMaintenanceSupabaseWriter({supabaseUrl:origin,publishableKey,fetchImpl});
  await assert.rejects(writer(change));
 }
});
test('secret keys and insecure origins are rejected',()=>{
 for(const [supabaseUrl,key] of [['http://example.test',publishableKey],[origin,'sb_secret_badbadbadbadbadbad'],['https://example.test/path',publishableKey]])
  assert.throws(()=>createSectionMaintenanceSupabaseWriter({supabaseUrl,publishableKey:key,fetchImpl:async()=>response({})}));
});
