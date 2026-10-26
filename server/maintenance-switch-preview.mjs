// Read-only preview of maintenance-switch decisions. No network or writes.
import {decideMaintenanceTransition} from './maintenance-switch-policy.mjs';
export function createMaintenanceSwitchPreview({verifyOwner,readState,checkRouting,releaseApproved=()=>false}={}){
 if(typeof verifyOwner!=='function'||typeof readState!=='function'||typeof checkRouting!=='function')
  throw Error('All verification dependencies are required');
 return async function preview(request){
  if(!request||request.method!=='POST')return {status:405,body:{allowed:false,reason:'POST required'}};
  if(request.origin!==request.expectedOrigin||!request.origin)
   return {status:403,body:{allowed:false,reason:'Same-origin request required'}};
  if(typeof request.csrfValid!=='boolean'||!request.csrfValid)
   return {status:403,body:{allowed:false,reason:'CSRF validation required'}};
  let actor,current,routingReady,approved;
  try{
   actor=await verifyOwner(request);
   if(!actor||actor.role!=='owner'||actor.isAnonymous)return {status:403,body:{allowed:false,reason:'Verified owner required'}};
   current=await readState();
   routingReady=await checkRouting();
   approved=await releaseApproved();
  }catch{return {status:503,body:{allowed:false,reason:'Control checks unavailable'}};}
  const decision=decideMaintenanceTransition({
   actor,ownerVerified:true,current,requested:request.requested,
   expectedRevision:request.expectedRevision,routingReady:routingReady===true,
   releaseApproved:approved===true
  });
  return {status:decision.allowed?200:409,body:{...decision,previewOnly:true,changed:false}};
 };
}
