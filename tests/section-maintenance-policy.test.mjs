import test from 'node:test';
import assert from 'node:assert/strict';
import {sectionAccess,SECTION_KEYS} from '../server/section-maintenance-policy.mjs';
const allOpen=Object.fromEntries(SECTION_KEYS.map(key=>[key,false]));

test('all ten expected sections have unique keys',()=>{
 assert.equal(SECTION_KEYS.length,10);
 assert.equal(new Set(SECTION_KEYS).size,10);
});
test('anonymous and player requests are denied if global status is missing or active',()=>{
 for(const globalMaintenance of [undefined,null,true,'false',0]){
  assert.equal(sectionAccess({section:'home',globalMaintenance,sectionStatuses:allOpen}).allowed,false);
 }
});
test('global maintenance blocks all player sections',()=>{
 for(const section of SECTION_KEYS)
  assert.equal(sectionAccess({section,globalMaintenance:true,sectionStatuses:allOpen}).allowed,false);
});
test('missing and invalid per-section statuses fail closed',()=>{
 for(const sectionStatuses of [undefined,null,{},[],{home:null},{home:'false'},{home:0},{home:true}])
  assert.equal(sectionAccess({section:'home',globalMaintenance:false,sectionStatuses}).allowed,false);
});
test('only explicit false allows a section when global maintenance is off',()=>{
 for(const section of SECTION_KEYS)
  assert.deepEqual(sectionAccess({section,globalMaintenance:false,sectionStatuses:allOpen}),{allowed:true,reason:'available'});
});
test('a section can be blocked independently of others',()=>{
 const statuses={...allOpen,radio:true};
 assert.equal(sectionAccess({section:'radio',globalMaintenance:false,sectionStatuses:statuses}).allowed,false);
 assert.equal(sectionAccess({section:'home',globalMaintenance:false,sectionStatuses:statuses}).allowed,true);
});
test('unknown sections deny even verified owners',()=>{
 assert.equal(sectionAccess({section:'secret',globalMaintenance:false,sectionStatuses:allOpen,verifiedOwner:true}).allowed,false);
});
test('only a strictly verified owner flag bypasses maintenance',()=>{
 assert.equal(sectionAccess({section:'radio',globalMaintenance:true,verifiedOwner:true}).allowed,true);
 for(const verifiedOwner of [false,'true',1,null,undefined])
  assert.equal(sectionAccess({section:'radio',globalMaintenance:true,verifiedOwner}).allowed,false);
});
