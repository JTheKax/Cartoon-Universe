import test from 'node:test';
import assert from 'node:assert/strict';
import {createSectionMaintenanceApi} from '../server/section-maintenance-api.mjs';
const origin='https://example.test';
const request=(changes={},overrides={})=>({method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({section:'radio',maintenanceEnabled:true,...changes}),...overrides});

test('valid verified owner request saves and audits server-side',async()=>{
 const writes=[];
 const api=createSectionMaintenanceApi({origin,verifyOwner:async()=>({verified:true,userId:'owner-id'}),saveChange:async value=>{writes.push(value);return {saved:true,audited:true};}});
 assert.equal((await api(request())).status,200);
 assert.deepEqual(writes,[{section:'radio',maintenanceEnabled:true,ownerId:'owner-id'}]);
});
test('anonymous, unverified and malformed owner sessions cannot write',async()=>{
 let writes=0;
 for(const owner of [null,{}, {verified:false,userId:'owner-id'}, {verified:true}, {verified:'true',userId:'owner-id'}]){
  const api=createSectionMaintenanceApi({origin,verifyOwner:async()=>owner,saveChange:async()=>{writes++;return {saved:true,audited:true};}});
  assert.equal((await api(request())).status,403);
 }
 assert.equal(writes,0);
});
test('cross-origin, invalid payload and incorrect method cannot write',async()=>{
 let writes=0;
 const api=createSectionMaintenanceApi({origin,verifyOwner:async()=>({verified:true,userId:'owner'}),saveChange:async()=>{writes++;return {saved:true,audited:true};}});
 for(const req of [request({}, {method:'GET'}),request({}, {headers:{origin:'https://evil.test','content-type':'application/json'}}),request({section:'unknown'}),request({maintenanceEnabled:'false'}),request({}, {body:'{'})])
  assert.notEqual((await api(req)).status,200);
 assert.equal(writes,0);
});
test('unconfirmed audit or database failure fails closed',async()=>{
 for(const saveChange of [async()=>({saved:true,audited:false}),async()=>{throw Error('offline');}]){
  const api=createSectionMaintenanceApi({origin,verifyOwner:async()=>({verified:true,userId:'owner'}),saveChange});
  assert.equal((await api(request())).status,503);
 }
});
