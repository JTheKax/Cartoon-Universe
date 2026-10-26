import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createCandidateServer} from './gateway-candidate.mjs';

async function withGateway(config,check){
 const server=createCandidateServer(config);
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{await check('http://127.0.0.1:'+server.address().port)}
 finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
}
test('candidate gateway does not expose settings endpoint by default',async()=>{
 await withGateway({},async origin=>{
  const res=await fetch(origin+'/__maintenance/owner/settings-preview');
  assert.equal(res.status,503);assert.match(await res.text(),/unavailable/);
 });
});
test('settings endpoint remains unavailable without owner verifier even with preview config',async()=>{
 await withGateway({maintenanceSettingsPreview:{readRoutingState:async()=>({routingConfirmed:true,masterMaintenance:false})}},async origin=>{
  const res=await fetch(origin+'/__maintenance/owner/settings-preview');
  assert.equal(res.status,503);
 });
});
test('non-owner requests cannot access protected arcade assets',async()=>{
 await withGateway({},async origin=>{
  for(const path of ['/__maintenance/arcade/maintenance-feature-review.js','/__maintenance/arcade/deploy/feature-status-preview/public-feature-status.mjs']){
   const res=await fetch(origin+path);assert.equal(res.status,503);
  }
 });
});
test('unknown gateway routes remain under maintenance',async()=>{
 await withGateway({},async origin=>{
  const res=await fetch(origin+'/shop/');assert.equal(res.status,503);
 });
});
