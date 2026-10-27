import test from 'node:test';
import assert from 'node:assert/strict';
import {guardSectionRoute} from '../server/section-route-guard.mjs';
import {SECTION_KEYS} from '../server/section-maintenance-policy.mjs';
const statuses=Object.fromEntries(SECTION_KEYS.map(key=>[key,false]));
test('known homepage opens only with explicitly disabled maintenance',()=>{
 assert.equal(guardSectionRoute({pathname:'/',globalMaintenance:false,sectionStatuses:statuses}).allowed,true);
 assert.equal(guardSectionRoute({pathname:'/',globalMaintenance:true,sectionStatuses:statuses}).allowed,false);
});
test('unmapped routes are always denied even for owners',()=>{
 for(const pathname of ['/admin','/secret','/coin-wallet.html','/__maintenance/arcade/owner.html',undefined])
  assert.equal(guardSectionRoute({pathname,globalMaintenance:false,sectionStatuses:statuses,verifiedOwner:true}).allowed,false);
});
test('section maintenance blocks the relevant route',()=>{
 assert.equal(guardSectionRoute({pathname:'/radio',globalMaintenance:false,sectionStatuses:{...statuses,radio:true}}).allowed,false);
 assert.equal(guardSectionRoute({pathname:'/games',globalMaintenance:false,sectionStatuses:{...statuses,radio:true}}).allowed,true);
});
