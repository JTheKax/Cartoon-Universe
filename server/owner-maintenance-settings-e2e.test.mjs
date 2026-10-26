import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createOwnerMaintenanceSettingsReader} from './owner-maintenance-settings-reader.mjs';

async function withServer({owner=false,state,readError=false},check){
 const handler=createOwnerMaintenanceSettingsReader({
  verifyOwner:async req=>owner && req.headers.cookie==='owner-session=valid',
  readRoutingState:async()=>{if(readError)throw Error('state offline');return state}
 });
 const server=createServer((req,res)=>{
  if(new URL(req.url,'http://localhost').pathname!=='/__maintenance/owner/settings-preview'){res.writeHead(404);res.end();return}
  void handler(req,res);
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{await check('http://127.0.0.1:'+server.address().port+'/__maintenance/owner/settings-preview')}
 finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
}
const state={routingConfirmed:true,masterMaintenance:false,routeStates:{home:'live',arcade:'maintenance',shop:'live',profiles:'maintenance',leaderboards:'maintenance'}};
test('authenticated dashboard GET receives effective per-page status over HTTP',async()=>{
 await withServer({owner:true,state},async url=>{
  const res=await fetch(url,{headers:{cookie:'owner-session=valid'},cache:'no-store'});
  assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');
  const data=await res.json();assert.equal(data.readOnly,true);
  const statuses=Object.fromEntries(data.features.map(f=>[f.id,f.status]));
  assert.equal(statuses.home,'LIVE');assert.equal(statuses.arcade,'MAINTENANCE');
 });
});
test('player without owner session cannot read settings',async()=>{
 await withServer({owner:true,state},async url=>{const res=await fetch(url);assert.equal(res.status,403)});
});
test('maintenance master overrides page live status',async()=>{
 await withServer({owner:true,state:{...state,masterMaintenance:true}},async url=>{
  const res=await fetch(url,{headers:{cookie:'owner-session=valid'}});
  assert.equal(res.status,200);assert.ok((await res.json()).features.every(f=>f.status==='MAINTENANCE'));
 });
});
test('routing outage returns unavailable instead of live',async()=>{
 await withServer({owner:true,readError:true},async url=>{
  const res=await fetch(url,{headers:{cookie:'owner-session=valid'}});
  assert.equal(res.status,503);assert.equal((await res.json()).error,'Maintenance settings unavailable');
 });
});
test('endpoint rejects attempts to change settings',async()=>{
 await withServer({owner:true,state},async url=>{
  const res=await fetch(url,{method:'POST',headers:{cookie:'owner-session=valid','content-type':'application/json'},body:'{}'});
  assert.equal(res.status,405);
 });
});
