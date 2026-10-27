import test from 'node:test';
import assert from 'node:assert/strict';
import {createSectionMaintenanceTransaction} from '../server/section-maintenance-transaction.mjs';
const change={section:'radio',maintenanceEnabled:true,ownerId:'owner'};

test('section update and audit succeed in one transaction',async()=>{
 const events=[];
 const save=createSectionMaintenanceTransaction({transaction:async callback=>callback({
  updateSection:async()=>{events.push('update');return {updated:true};},
  insertAudit:async()=>{events.push('audit');return {inserted:true};}
 })});
 assert.deepEqual(await save(change),{saved:true,audited:true});
 assert.deepEqual(events,['update','audit']);
});
test('missing audit acknowledgement rejects update',async()=>{
 const save=createSectionMaintenanceTransaction({transaction:async callback=>callback({
  updateSection:async()=>({updated:true}),insertAudit:async()=>({inserted:false})
 })});
 await assert.rejects(save(change),/Audit insert unconfirmed/);
});
test('failed update never reaches audit',async()=>{
 let audited=false;
 const save=createSectionMaintenanceTransaction({transaction:async callback=>callback({
  updateSection:async()=>({updated:false}),insertAudit:async()=>{audited=true;return {inserted:true};}
 })});
 await assert.rejects(save(change),/Section update unconfirmed/);
 assert.equal(audited,false);
});
test('missing transaction confirmation is rejected',async()=>{
 const save=createSectionMaintenanceTransaction({transaction:async()=>({saved:true,audited:false})});
 await assert.rejects(save(change),/Transaction unconfirmed/);
});
