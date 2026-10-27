import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createSectionMaintenanceGatewayAdapter} from '../server/section-maintenance-gateway-adapter.mjs';
const origin='https://example.test';
function req(body,options={}){
 const stream=Readable.from([body]);
 stream.url=options.url??'/__maintenance/section-status';
 stream.method=options.method??'POST';
 stream.headers=options.headers??{origin,'content-type':'application/json','content-length':String(Buffer.byteLength(body))};
 return stream;
}
function res(){return {status:null,body:'',writeHead(code){this.status=code;},end(body){this.body=body??'';}};}
const payload=JSON.stringify({section:'radio',maintenanceEnabled:true});
test('valid owner request reaches transactional adapter',async()=>{
 const writes=[];
 const handle=createSectionMaintenanceGatewayAdapter({origin,verifyOwner:async()=>({verified:true,userId:'owner'}),saveChange:async change=>{writes.push(change);return {saved:true,audited:true};}});
 const response=res();assert.equal(await handle(req(payload),response),true);
 assert.equal(response.status,200);assert.equal(writes.length,1);
});
test('unrelated paths are not intercepted',async()=>{
 const handle=createSectionMaintenanceGatewayAdapter({origin,verifyOwner:async()=>({verified:true,userId:'owner'}),saveChange:async()=>({saved:true,audited:true})});
 assert.equal(await handle(req(payload,{url:'/other'}),res()),false);
});
test('oversized and chunked bodies are rejected before persistence',async()=>{
 let writes=0;
 const handle=createSectionMaintenanceGatewayAdapter({origin,verifyOwner:async()=>({verified:true,userId:'owner'}),saveChange:async()=>{writes++;return {saved:true,audited:true};}});
 for(const headers of [{origin,'content-type':'application/json','content-length':'2048'},{origin,'content-type':'application/json','transfer-encoding':'chunked'}]){
  const response=res();await handle(req(payload,{headers}),response);assert.equal(response.status,413);
 }
 assert.equal(writes,0);
});
test('cross-origin and unverified owner requests fail',async()=>{
 const handle=createSectionMaintenanceGatewayAdapter({origin,verifyOwner:async()=>({verified:false}),saveChange:async()=>({saved:true,audited:true})});
 const response=res();await handle(req(payload),response);assert.equal(response.status,403);
});
