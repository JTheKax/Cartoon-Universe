import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createSectionMaintenanceReviewGateway} from '../server/section-maintenance-review-gateway.mjs';
import {SECTION_KEYS} from '../server/section-maintenance-policy.mjs';
import {SECTION_PAGE_ROUTES,SECTION_MUTATION_ROUTES,sectionForRoute} from '../server/section-route-guard.mjs';
const origin='https://cartoon-universe-review.test';
const rows=()=>SECTION_KEYS.map(section_key=>({section_key,maintenance_enabled:false}));
async function fixture({snapshot=()=>({globalMaintenance:false,sectionRows:rows()}),saveChange=async()=>({saved:true,audited:true})}={}){
 const calls=[];
 const server=createSectionMaintenanceReviewGateway({
  origin,loadSnapshot:snapshot,
  verifyOwner:async req=>req.headers['x-test-owner']==='owner-session'
   ?{verified:true,userId:'isolated-owner'}:{verified:false},
  saveChange:async change=>{calls.push({kind:'award',change});return saveChange(change);},
  servePage:async ({pathname})=>{calls.push({kind:'page',pathname});return {status:200,body:{page:pathname}};},
  performMutation:async ({pathname})=>{calls.push({kind:'mutation',pathname});return {status:200,body:{mutation:pathname}};}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const url='http://127.0.0.1:'+server.address().port;
 return {calls,request:(path,options)=>fetch(url+path,options),close:()=>new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))};
}
test('HTTP gateway blocks every registered page and mutation during global maintenance except verified owner',async()=>{
 const f=await fixture({snapshot:()=>({globalMaintenance:true,sectionRows:rows()})});
 try{
  for(const [path,method] of [['/shop-watch-movies.html','GET'],['/api/community/post','POST']]){
   const player=await f.request(path,{method});assert.equal(player.status,503,path);
   const owner=await f.request(path,{method,headers:{'x-test-owner':'owner-session'}});
   assert.equal(owner.status,200,path);
  }
  assert.equal(f.calls.filter(call=>call.kind==='page'||call.kind==='mutation').length,2);
 }finally{await f.close();}
});
test('section-specific maintenance blocks page and mutation while unrelated section remains live',async()=>{
 const sectionRows=rows().map(row=>row.section_key==='movie-theater'?{...row,maintenance_enabled:true}:row);
 const f=await fixture({snapshot:()=>({globalMaintenance:false,sectionRows})});
 try{
  assert.equal((await f.request('/shop-watch-movies.html')).status,503);
  assert.equal((await f.request('/api/theater/schedule',{method:'POST'})).status,503);
  assert.equal((await f.request('/shop-community.html')).status,200);
  assert.equal((await f.request('/api/community/post',{method:'POST'})).status,200);
  assert.equal((await f.request('/api/theater/schedule',{method:'POST',headers:{'x-test-owner':'owner-session'}})).status,200);
 }finally{await f.close();}
});
test('invalid or unavailable maintenance state fails closed even for verified owners',async()=>{
 for(const snapshot of [async()=>{throw Error('database offline');},async()=>({globalMaintenance:null,sectionRows:rows()})]){
  const f=await fixture({snapshot});
  try{
   for(const path of ['/index.html','/api/coins/transfer']){
    const response=await f.request(path,{method:path.startsWith('/api')?'POST':'GET',headers:{'x-test-owner':'owner-session'}});
    assert.equal(response.status,503);
   }
   assert.equal(f.calls.length,0);
  }finally{await f.close();}
 }
});
test('unknown paths, assets and wrong methods never reach injected handlers',async()=>{
 const f=await fixture();
 try{
  for(const [path,method] of [['/secret','GET'],['/styles.css','GET'],['/index.html','POST'],['/api/coins/transfer','GET'],['/shop-watch-movies.html%2f','GET']])
   assert.equal((await f.request(path,{method,headers:{'x-test-owner':'owner-session'}})).status,404,path);
  assert.equal(f.calls.length,0);
 }finally{await f.close();}
});
test('real HTTP section-status endpoint requires verified owner, origin, and confirmed audit',async()=>{
 const f=await fixture();
 const body=JSON.stringify({section:'movie-theater',maintenanceEnabled:true});
 try{
  const headers={'Content-Type':'application/json',Origin:origin};
  assert.equal((await f.request('/__maintenance/section-status',{method:'POST',headers,body})).status,403);
  assert.equal((await f.request('/__maintenance/section-status',{method:'POST',headers:{...headers,Origin:'https://attacker.test','x-test-owner':'owner-session'},body})).status,403);
  assert.equal((await f.request('/__maintenance/section-status',{method:'POST',headers:{...headers,'x-test-owner':'owner-session'},body:JSON.stringify({section:'movie-theater',maintenanceEnabled:true,ownerId:'forged'})})).status,400);
  assert.equal(f.calls.length,0);
  const good=await f.request('/__maintenance/section-status',{method:'POST',headers:{...headers,'x-test-owner':'owner-session'},body});
  assert.equal(good.status,200);
  assert.equal(f.calls.length,1);
  assert.deepEqual(f.calls[0].change,{section:'movie-theater',maintenanceEnabled:true,ownerId:'isolated-owner'});
 }finally{await f.close();}
});
test('unconfirmed audit never produces a successful HTTP write response',async()=>{
 const f=await fixture({saveChange:async()=>({saved:true,audited:false})});
 try{
  const response=await f.request('/__maintenance/section-status',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'x-test-owner':'owner-session'},body:JSON.stringify({section:'radio',maintenanceEnabled:true})});
  assert.equal(response.status,503);
 }finally{await f.close();}
});

test('HTTP route matrix: every registered page and mutation is guarded independently',async()=>{
 let globalMaintenance=false;
 let blockedSection=null;
 const f=await fixture({snapshot:()=>({
  globalMaintenance,
  sectionRows:rows().map(row=>row.section_key===blockedSection?{...row,maintenance_enabled:true}:row)
 })});
 try{
  const routes=[
   ...SECTION_PAGE_ROUTES.map(path=>[path,'GET']),
   ...SECTION_MUTATION_ROUTES.map(path=>[path,'POST'])
  ];
  assert.ok(routes.length>=35,'route catalog unexpectedly shrank');
  for(const [path,method] of routes){
   const section=sectionForRoute({pathname:path,method});
   assert.ok(SECTION_KEYS.includes(section),path);
   blockedSection=null;globalMaintenance=false;
   assert.equal((await f.request(path,{method})).status,200,'live '+method+' '+path);
   blockedSection=section;
   assert.equal((await f.request(path,{method})).status,503,'section maintenance '+method+' '+path);
   assert.equal((await f.request(path,{method,headers:{'x-test-owner':'owner-session'}})).status,200,'owner section bypass '+method+' '+path);
   blockedSection=null;globalMaintenance=true;
   assert.equal((await f.request(path,{method})).status,503,'global maintenance '+method+' '+path);
   assert.equal((await f.request(path,{method,headers:{'x-test-owner':'owner-session'}})).status,200,'owner global bypass '+method+' '+path);
  }
  globalMaintenance=false;blockedSection=null;
  for(const path of SECTION_PAGE_ROUTES){
   assert.equal((await f.request(path,{method:'HEAD'})).status,200,'HEAD '+path);
   assert.equal((await f.request(path,{method:'POST'})).status,404,'page POST must not mutate '+path);
  }
  for(const path of SECTION_MUTATION_ROUTES){
   assert.equal((await f.request(path,{method:'GET'})).status,404,'mutation GET must not read '+path);
   assert.equal((await f.request(path,{method:'PUT'})).status,404,'mutation PUT must not write '+path);
  }
 }finally{await f.close();}
});
test('HTTP route matrix: missing or duplicate section records never open a player route',async()=>{
 const cases=[
  rows().filter(row=>row.section_key!=='movie-theater'),
  [...rows(),{section_key:'movie-theater',maintenance_enabled:false}],
  rows().map(row=>row.section_key==='movie-theater'?{...row,maintenance_enabled:'false'}:row)
 ];
 for(const sectionRows of cases){
  const f=await fixture({snapshot:()=>({globalMaintenance:false,sectionRows})});
  try{
   assert.equal((await f.request('/shop-watch-movies.html')).status,503);
   assert.equal((await f.request('/api/theater/schedule',{method:'POST'})).status,503);
   assert.equal((await f.request('/shop-community.html')).status,200);
  }finally{await f.close();}
 }
});
