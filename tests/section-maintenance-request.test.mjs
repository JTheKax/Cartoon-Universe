import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSectionChange} from '../server/section-maintenance-request.mjs';
import {SECTION_KEYS} from '../server/section-maintenance-policy.mjs';

test('valid section requests require explicit boolean states',()=>{
 for(const section of SECTION_KEYS)for(const maintenanceEnabled of [true,false])
  assert.deepEqual(validateSectionChange({section,maintenanceEnabled}),{ok:true,section,maintenanceEnabled});
});
test('malformed, unknown, and ambiguous requests are rejected',()=>{
 for(const value of [null,undefined,[],{},'home',
  {section:'home'}, {section:'unknown',maintenanceEnabled:false},
  {section:'home',maintenanceEnabled:'false'},
  {section:'home',maintenanceEnabled:0},
  {section:'home',maintenanceEnabled:false,verifiedOwner:true},
  {section:'__proto__',maintenanceEnabled:false}
 ])assert.equal(validateSectionChange(value).ok,false);
});
