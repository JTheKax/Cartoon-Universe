import {SECTION_KEYS} from './section-maintenance-policy.mjs';
const known=new Set(SECTION_KEYS);
const safe=(value)=>typeof value==='string'&&known.has(value);
// Validation only. This does not authenticate a user or mutate state.
// The caller must verify the owner session and same-origin request on the server.
export function validateSectionChange(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {ok:false,reason:'invalid-payload'};
 if(Object.keys(input).length!==2||!Object.hasOwn(input,'section')||!Object.hasOwn(input,'maintenanceEnabled'))
  return {ok:false,reason:'invalid-fields'};
 if(!safe(input.section))return {ok:false,reason:'invalid-section'};
 if(typeof input.maintenanceEnabled!=='boolean')return {ok:false,reason:'invalid-state'};
 return {ok:true,section:input.section,maintenanceEnabled:input.maintenanceEnabled};
}
