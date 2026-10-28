import test from 'node:test';
import assert from 'node:assert/strict';
import {guardSectionRoute,sectionForRoute,SECTION_PAGE_ROUTES,SECTION_MUTATION_ROUTES} from '../server/section-route-guard.mjs';
import {SECTION_KEYS} from '../server/section-maintenance-policy.mjs';
const statuses=Object.fromEntries(SECTION_KEYS.map(key=>[key,false]));
test('homepage opens only with explicitly disabled global and home maintenance',()=>{
 assert.equal(guardSectionRoute({pathname:'/',globalMaintenance:false,sectionStatuses:statuses}).allowed,true);
 assert.equal(guardSectionRoute({pathname:'/',globalMaintenance:true,sectionStatuses:statuses}).allowed,false);
 assert.equal(guardSectionRoute({pathname:'/',globalMaintenance:false,sectionStatuses:{...statuses,home:true}}).allowed,false);
});
test('every mapped page and mutation fails closed when global or its section is in maintenance',()=>{
 for(const [routes,method] of [[SECTION_PAGE_ROUTES,'GET'],[SECTION_MUTATION_ROUTES,'POST']]){
  for(const pathname of routes){
   const section=sectionForRoute({pathname,method});
   assert.ok(SECTION_KEYS.includes(section),pathname);
   assert.equal(guardSectionRoute({pathname,method,globalMaintenance:false,sectionStatuses:statuses}).allowed,true,pathname);
   assert.equal(guardSectionRoute({pathname,method,globalMaintenance:true,sectionStatuses:statuses}).allowed,false,pathname);
   assert.equal(guardSectionRoute({pathname,method,globalMaintenance:false,sectionStatuses:{...statuses,[section]:true}}).allowed,false,pathname);
   assert.equal(guardSectionRoute({pathname,method,globalMaintenance:false,sectionStatuses:{...statuses,[section]:undefined}}).allowed,false,pathname);
  }
 }
});
test('unknown, malformed, and wrong-method routes are denied even for owners',()=>{
 for(const pathname of ['/admin','/secret','/__maintenance/arcade/owner.html','/index.html?admin=1','/foo%2fbar','/shop//packs','/shop/../owner.html','/api/unregistered',undefined])
  assert.equal(guardSectionRoute({pathname,globalMaintenance:false,sectionStatuses:statuses,verifiedOwner:true}).allowed,false,String(pathname));
 assert.equal(guardSectionRoute({pathname:'/api/coins/transfer',method:'GET',globalMaintenance:false,sectionStatuses:statuses,verifiedOwner:true}).allowed,false);
 assert.equal(guardSectionRoute({pathname:'/coin-wallet.html',method:'POST',globalMaintenance:false,sectionStatuses:statuses,verifiedOwner:true}).allowed,false);
 assert.equal(guardSectionRoute({pathname:'/index.html',method:'TRACE',globalMaintenance:false,sectionStatuses:statuses,verifiedOwner:true}).allowed,false);
});
test('only server-verified owners bypass global and section maintenance for registered routes',()=>{
 for(const [pathname,method] of [['/shop-watch-movies.html','GET'],['/api/theater/schedule','POST']]){
  assert.equal(guardSectionRoute({pathname,method,globalMaintenance:true,sectionStatuses:statuses,verifiedOwner:false}).allowed,false);
  assert.equal(guardSectionRoute({pathname,method,globalMaintenance:true,sectionStatuses:statuses,verifiedOwner:true}).allowed,true);
  assert.equal(guardSectionRoute({pathname,method,globalMaintenance:true,sectionStatuses:statuses,verifiedOwner:'true'}).allowed,false);
 }
});
test('individual section maintenance does not block unrelated sections',()=>{
 assert.equal(guardSectionRoute({pathname:'/radio',globalMaintenance:false,sectionStatuses:{...statuses,radio:true}}).allowed,false);
 assert.equal(guardSectionRoute({pathname:'/shop-games-arcade.html',globalMaintenance:false,sectionStatuses:{...statuses,radio:true}}).allowed,true);
});
