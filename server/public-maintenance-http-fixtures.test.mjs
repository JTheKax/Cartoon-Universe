import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicMaintenanceHttpHandler} from './public-maintenance-http.mjs';
const state={routingConfirmed:true,masterMaintenance:false,routeStates:{home:'live',arcade:'maintenance',shop:'live'}};
function responder(status,body){return async(req,res)=>{res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':body)}}
async function run(path,{owner=false,routing=state,method='GET'}={}){
 const handler=createPublicMaintenanceHttpHandler({
  readRoutingState:async()=>routing,verifyOwner:async()=>owner,
  servePublic:responder(200,'<h1>Cartoon Universe Shop</h1>'),
  serveOwnerPreview:responder(200,'<h1>Private owner preview</h1>'),
  serveMaintenance:responder(503,'<h1>Under maintenance</h1>')
 });
 const response={status:0,body:null,headers:{},writeHead(code,headers){this.status=code;this.headers=headers},end(body=''){this.body=body}};
 await handler({method,url:path,headers:{}},response);return response;
}
test('live page responds 200 with public content',async()=>{const r=await run('/shop/');assert.equal(r.status,200);assert.match(r.body,/Cartoon Universe Shop/)});
test('direct maintained page responds 503 without public content',async()=>{const r=await run('/arcade/game');assert.equal(r.status,503);assert.doesNotMatch(r.body,/Shop/)});
test('owner preview responds with private fixture',async()=>{const r=await run('/arcade/game',{owner:true});assert.equal(r.status,200);assert.match(r.body,/Private owner preview/)});
test('master override responds maintenance',async()=>assert.equal((await run('/shop/',{routing:{...state,masterMaintenance:true}})).status,503));
test('unknown route responds maintenance',async()=>assert.equal((await run('/private-unreleased')).status,503));
test('unconfirmed routing responds maintenance',async()=>assert.equal((await run('/shop/',{routing:{}})).status,503));
test('HEAD request does not emit page body',async()=>assert.equal((await run('/shop/',{method:'HEAD'})).body,''));
