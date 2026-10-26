import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createOwnerMaintenancePreviewRoute} from './owner-maintenance-preview-route.mjs';
const origin='https://cartoon-universe-gateway.onrender.com';
async function invoke(authorized){
 const route=createOwnerMaintenancePreviewRoute({
  ownerVerification:{authorized:async()=>authorized},siteOrigin:origin,
  validateCsrf:async()=>true,readState:async()=>({enabled:true,revision:1}),
  checkRouting:async()=>true,releaseApproved:async()=>true
 });
 const payload=JSON.stringify({requested:false,expectedRevision:1});
 const req=Readable.from([payload]);req.method='POST';req.url='/__maintenance/control/preview';
 req.headers={origin,'content-type':'application/json','content-length':String(Buffer.byteLength(payload)),cookie:'__Host-cu_owner_verify=test'};
 const res={writeHead(status){this.status=status},end(body){this.body=JSON.parse(body)}};
 assert.equal(await route(req,res),true);
 return res;
}
test('verified owner session previews without writing',async()=>{const r=await invoke(true);assert.equal(r.status,200);assert.equal(r.body.changed,false)});
test('missing or nonowner session denied',async()=>assert.equal((await invoke(false)).status,403));
test('unknown routes are not intercepted',async()=>{const route=createOwnerMaintenancePreviewRoute({ownerVerification:{authorized:async()=>true},validateCsrf:async()=>true});assert.equal(await route({url:'/other'},{}),false)});
