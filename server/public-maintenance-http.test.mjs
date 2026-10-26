import test from 'node:test';import assert from 'node:assert/strict';
import {createPublicMaintenanceHttpHandler} from './public-maintenance-http.mjs';
const state={routingConfirmed:true,masterMaintenance:false,routeStates:{home:'live',arcade:'maintenance',shop:'live'}};
async function request(path,{stateOverride=state,owner=false,method='GET',throwPublic=false}={}){
 const calls=[];const handler=createPublicMaintenanceHttpHandler({
  readRoutingState:async()=>stateOverride,verifyOwner:async()=>owner,
  servePublic:async()=>{calls.push('public');if(throwPublic)throw Error('outage')},
  serveOwnerPreview:async()=>calls.push('owner'),
  serveMaintenance:async()=>calls.push('maintenance')
 });const res={writeHead(code){this.code=code},end(){}};
 await handler({url:path,method},res);return {calls,res};
}
test('confirmed live feature serves public content',async()=>assert.deepEqual((await request('/shop/')).calls,['public']));
test('maintained feature blocks direct URL',async()=>assert.deepEqual((await request('/arcade/game')).calls,['maintenance']));
test('verified owner gets private preview',async()=>assert.deepEqual((await request('/arcade/game',{owner:true})).calls,['owner']));
test('master maintenance blocks public content',async()=>assert.deepEqual((await request('/shop/',{stateOverride:{...state,masterMaintenance:true}})).calls,['maintenance']));
test('unconfirmed state fails closed',async()=>assert.deepEqual((await request('/shop/',{stateOverride:{}})).calls,['maintenance']));
test('public serving failure falls back to maintenance',async()=>assert.deepEqual((await request('/shop/',{throwPublic:true})).calls,['public','maintenance']));
test('nonread methods denied',async()=>assert.equal((await request('/shop/',{method:'POST'})).res.code,405));
