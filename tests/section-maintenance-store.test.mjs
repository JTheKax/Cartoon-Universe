import test from 'node:test';
import assert from 'node:assert/strict';
import {SECTION_KEYS} from '../server/section-maintenance-policy.mjs';
import {normalizeSectionStatuses} from '../server/section-maintenance-store.mjs';

test('missing or invalid rows keep every section in maintenance',()=>{
 for(const rows of [null,undefined,{},'invalid',[]]){
  const result=normalizeSectionStatuses(rows);
  assert.deepEqual(Object.keys(result),SECTION_KEYS);
  assert.ok(Object.values(result).every(Boolean));
 }
});
test('explicit false is required to open a section',()=>{
 const result=normalizeSectionStatuses([
  {section_key:'home',maintenance_enabled:false},
  {section_key:'radio',maintenance_enabled:'false'},
  {section_key:'games',maintenance_enabled:null},
  {section_key:'unknown',maintenance_enabled:false}
 ]);
 assert.equal(result.home,false);
 assert.equal(result.radio,true);
 assert.equal(result.games,true);
 assert.equal(result.explore,true);
 assert.equal(Object.hasOwn(result,'unknown'),false);
});
test('duplicate rows never open a section regardless of order',()=>{
 for(const rows of [
  [{section_key:'home',maintenance_enabled:false},{section_key:'home',maintenance_enabled:true}],
  [{section_key:'home',maintenance_enabled:true},{section_key:'home',maintenance_enabled:false}],
  [{section_key:'home',maintenance_enabled:false},{section_key:'home',maintenance_enabled:false}]
 ])assert.equal(normalizeSectionStatuses(rows).home,true);
});
test('normalized snapshot cannot be modified',()=>{
 assert.equal(Object.isFrozen(normalizeSectionStatuses([])),true);
});
