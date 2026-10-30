import {validateSectionChange} from './section-maintenance-request.mjs';

// Isolated handler, not mounted on any live gateway. Dependencies must be supplied
// by a trusted server adapter. Never accept an owner flag from the request body.
export function createSectionMaintenanceApi({origin,verifyOwner,saveChange}){
 if(typeof origin!=='string'||!/^https:\/\/[^/]+$/.test(origin)||typeof verifyOwner!=='function'||typeof saveChange!=='function')
  throw new Error('Explicit secure origin and server adapters required');
 return async function handle(req){
  if(req.method!=='POST')return {status:405,body:{error:'method-not-allowed'}};
  if(req.headers?.origin!==origin)return {status:403,body:{error:'origin-required'}};
  if(req.headers?.['content-type']!=='application/json')return {status:415,body:{error:'json-required'}};
  let change;
  try{change=validateSectionChange(JSON.parse(req.body));}catch{return {status:400,body:{error:'invalid-json'}};}
  if(!change.ok)return {status:400,body:{error:change.reason}};
  let owner;
  try{owner=await verifyOwner(req);}catch{return {status:503,body:{error:'owner-verification-unavailable'}};}
  if(owner?.verified!==true||typeof owner.userId!=='string'||!owner.userId)
   return {status:403,body:{error:'owner-required'}};
  try{
   // The access token, when supplied, comes only from the trusted server-side
   // owner session resolver. It is never accepted from the JSON request body.
   const write={section:change.section,maintenanceEnabled:change.maintenanceEnabled,ownerId:owner.userId};
   if(typeof owner.accessToken==='string'&&owner.accessToken)write.accessToken=owner.accessToken;
   const result=await saveChange(write);
   if(result?.saved!==true||result?.audited!==true)return {status:503,body:{error:'save-unconfirmed'}};
   return {status:200,body:{saved:true,section:change.section,maintenanceEnabled:change.maintenanceEnabled}};
  }catch{return {status:503,body:{error:'save-unavailable'}};}
 };
}
