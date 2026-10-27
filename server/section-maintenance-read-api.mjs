import {SECTION_KEYS} from './section-maintenance-policy.mjs';
import {normalizeSectionStatuses} from './section-maintenance-store.mjs';

// Isolated, read-only endpoint. Not wired to production routing.
// loadSnapshot must be a trusted server adapter that reads maintenance state.
export function createSectionMaintenanceReadApi({loadSnapshot}){
 if(typeof loadSnapshot!=='function')throw new Error('Trusted snapshot loader required');
 return async function read(){
  try{
   const snapshot=await loadSnapshot();
   if(snapshot?.globalMaintenance!==true&&snapshot?.globalMaintenance!==false)throw Error('invalid global state');
   const statuses=normalizeSectionStatuses(snapshot.sectionRows);
   return {status:200,body:{globalMaintenance:snapshot.globalMaintenance,sections:statuses,sectionKeys:SECTION_KEYS}};
  }catch{
   return {status:503,body:{globalMaintenance:true,sections:normalizeSectionStatuses([]),sectionKeys:SECTION_KEYS,error:'maintenance-state-unavailable'}};
  }
 };
}
