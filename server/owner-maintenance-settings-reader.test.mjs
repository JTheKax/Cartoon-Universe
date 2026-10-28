import test from 'node:test';import assert from 'node:assert/strict';
import {createOwnerMaintenanceSettingsReader} from './owner-maintenance-settings-reader.mjs';
async function call({owner=true,state={routingConfirmed:true,masterMaintenance:false,routeStates:{home:'live',arcade:'maintenance'}},method='GET'}={}){
 const handler=createOwnerMaintenanceSettingsReader({verifyOwner:async()=>owner,readRoutingState:async()=>state});
 const res={writeHead(status,headers){this.status=status;this.headers=headers},end(body){this.body=JSON.parse(body)}};
 await handler({method},res);return res;
}
test('verified owner reads effective per-feature status',async()=>{const r=await call();assert.equal(r.status,200);assert.equal(r.body.readOnly,true);assert.equal(r.body.features[0].status,'LIVE');assert.equal(r.body.features[1].status,'MAINTENANCE')});
test('regular player denied',async()=>assert.equal((await call({owner:false})).status,403));
test('unconfirmed routing fails closed',async()=>assert.equal((await call({state:{}})).status,503));
test('writes not supported',async()=>assert.equal((await call({method:'POST'})).status,405));
test('responses are not cacheable',async()=>assert.equal((await call()).headers['Cache-Control'],'no-store'));
