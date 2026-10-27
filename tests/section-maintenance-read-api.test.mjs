import test from 'node:test';
import assert from 'node:assert/strict';
import {createSectionMaintenanceReadApi} from '../server/section-maintenance-read-api.mjs';

test('valid snapshots provide normalized read-only statuses',async()=>{
 const read=createSectionMaintenanceReadApi({loadSnapshot:async()=>({globalMaintenance:false,sectionRows:[{section_key:'home',maintenance_enabled:false}]})});
 const result=await read();
 assert.equal(result.status,200);
 assert.equal(result.body.globalMaintenance,false);
 assert.equal(result.body.sections.home,false);
 assert.equal(result.body.sections.radio,true);
});
test('missing or invalid global state fails closed',async()=>{
 for(const globalMaintenance of [undefined,null,'false',0]){
  const read=createSectionMaintenanceReadApi({loadSnapshot:async()=>({globalMaintenance,sectionRows:[]})});
  const result=await read();
  assert.equal(result.status,503);
  assert.equal(result.body.globalMaintenance,true);
  assert.ok(Object.values(result.body.sections).every(Boolean));
 }
});
test('database outage fails closed',async()=>{
 const read=createSectionMaintenanceReadApi({loadSnapshot:async()=>{throw Error('database offline');}});
 const result=await read();
 assert.equal(result.status,503);
 assert.equal(result.body.globalMaintenance,true);
 assert.ok(Object.values(result.body.sections).every(Boolean));
});
