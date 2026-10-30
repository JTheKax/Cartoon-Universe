import test from 'node:test';
import assert from 'node:assert/strict';
import {createSectionMaintenanceSupabaseReader} from '../server/section-maintenance-supabase-reader.mjs';
import {createSectionMaintenanceReadApi} from '../server/section-maintenance-read-api.mjs';
import {SECTION_KEYS} from '../server/section-maintenance-policy.mjs';
const origin='https://example.test';
const publishableKey='sb_publishable_disposable_test_key_123456';
const response=body=>({ok:true,json:async()=>body});
const sections=()=>SECTION_KEYS.map(section_key=>({section_key,maintenance_enabled:section_key!=='radio'}));

test('reads one consistent global and section snapshot with only a public key',async()=>{
 const calls=[];
 const loadSnapshot=createSectionMaintenanceSupabaseReader({supabaseUrl:origin,publishableKey,fetchImpl:async(url,options)=>{
  calls.push({url,options});return response({globalMaintenance:false,sectionRows:sections()});
 }});
 const result=await createSectionMaintenanceReadApi({loadSnapshot})();
 assert.equal(result.status,200);
 assert.equal(result.body.globalMaintenance,false);
 assert.equal(result.body.sections.radio,false);
 assert.equal(result.body.sections.home,true);
 assert.equal(calls.length,1,'Must not read global and section state in separate requests');
 assert.equal(calls[0].url,origin+'/rest/v1/rpc/get_maintenance_snapshot');
 assert.equal(calls[0].options.method,'GET');
 assert.equal(calls[0].options.headers.apikey,publishableKey);
 assert.ok(!('Authorization' in calls[0].options.headers));
});
test('rejects secret keys, insecure origins, and origins with paths',()=>{
 for(const [supabaseUrl,key] of [
  ['http://example.test',publishableKey],
  ['https://example.test/other',publishableKey],
  [origin,'sb_secret_never_allowed_123456789'],
  [origin,'service_role_secret'],
  [origin,'']
 ])assert.throws(()=>createSectionMaintenanceSupabaseReader({supabaseUrl,publishableKey:key,fetchImpl:async()=>response({})}));
});
test('missing, partial, duplicated, corrupt, or offline snapshots fail closed',async()=>{
 const valid=sections();
 for(const fetchImpl of [
  async()=>response({globalMaintenance:null,sectionRows:valid}),
  async()=>response({globalMaintenance:false,sectionRows:valid.slice(1)}),
  async()=>response({globalMaintenance:false,sectionRows:[...valid.slice(1),valid[1]]}),
  async()=>response({globalMaintenance:false,sectionRows:valid.map(row=>row.section_key==='radio'?{...row,maintenance_enabled:'false'}:row)}),
  async()=>response({globalMaintenance:false,sectionRows:null}),
  async()=>{throw Error('offline');},
  async()=>response([{globalMaintenance:false,sectionRows:valid}]),
  async()=>({ok:false,json:async()=>({globalMaintenance:false,sectionRows:valid})})
 ]){
  const read=createSectionMaintenanceReadApi({loadSnapshot:createSectionMaintenanceSupabaseReader({supabaseUrl:origin,publishableKey,fetchImpl})});
  const result=await read();
  assert.equal(result.status,503);
  assert.equal(result.body.globalMaintenance,true);
  assert.ok(Object.values(result.body.sections).every(Boolean));
 }
});
