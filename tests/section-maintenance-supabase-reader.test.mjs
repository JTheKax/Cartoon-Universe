import test from 'node:test';
import assert from 'node:assert/strict';
import {createSectionMaintenanceSupabaseReader} from '../server/section-maintenance-supabase-reader.mjs';
import {createSectionMaintenanceReadApi} from '../server/section-maintenance-read-api.mjs';
const origin='https://example.test';
const publishableKey='sb_publishable_disposable_test_key_123456';
const response=body=>({ok:true,json:async()=>body});

test('reads global and section statuses using only a public key',async()=>{
 const calls=[];
 const loadSnapshot=createSectionMaintenanceSupabaseReader({supabaseUrl:origin,publishableKey,fetchImpl:async(url,options)=>{
  calls.push({url,options});
  return response(url.includes('/site_maintenance?')?[{enabled:false}]:[{section_key:'radio',maintenance_enabled:false}]);
 }});
 const read=createSectionMaintenanceReadApi({loadSnapshot});
 const result=await read();
 assert.equal(result.status,200);
 assert.equal(result.body.globalMaintenance,false);
 assert.equal(result.body.sections.radio,false);
 assert.equal(result.body.sections.home,true);
 assert.equal(calls.length,2);
 assert.ok(calls.every(call=>call.options.method==='GET'&&call.options.headers.apikey===publishableKey));
 assert.ok(calls.every(call=>!('Authorization' in call.options.headers)));
});
test('rejects secret keys, insecure origins, and origins with paths',()=>{
 for(const [supabaseUrl,key] of [
  ['http://example.test',publishableKey],
  ['https://example.test/other',publishableKey],
  [origin,'sb_secret_never_allowed_123456789'],
  [origin,'service_role_secret'],
  [origin,'']
 ])assert.throws(()=>createSectionMaintenanceSupabaseReader({supabaseUrl,publishableKey:key,fetchImpl:async()=>response([])}));
});
test('missing global row and network errors force every section closed',async()=>{
 for(const fetchImpl of [
  async(url)=>response(url.includes('/site_maintenance?')?[]:[{section_key:'radio',maintenance_enabled:false}]),
  async()=>{throw Error('offline');},
  async()=>response({not:'an array'})
 ]){
  const read=createSectionMaintenanceReadApi({loadSnapshot:createSectionMaintenanceSupabaseReader({supabaseUrl:origin,publishableKey,fetchImpl})});
  const result=await read();
  assert.equal(result.status,503);
  assert.equal(result.body.globalMaintenance,true);
  assert.ok(Object.values(result.body.sections).every(Boolean));
 }
});
