// Pure, fail-closed maintenance-switch authorization policy.
// This module intentionally performs no network calls or state changes.
export function decideMaintenanceTransition({
 actor, current, requested, expectedRevision, releaseApproved=false,
 routingReady=false, ownerVerified=false
}={}){
 if(!ownerVerified||!actor||actor.isAnonymous||actor.role!=='owner')
  return {allowed:false,reason:'Verified owner required'};
 if(!current||typeof current.enabled!=='boolean'||!Number.isSafeInteger(current.revision))
  return {allowed:false,reason:'Current maintenance state unavailable'};
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==current.revision)
  return {allowed:false,reason:'Stale maintenance state'};
 if(typeof requested!=='boolean')
  return {allowed:false,reason:'Invalid requested maintenance state'};
 if(requested===current.enabled)
  return {allowed:false,reason:'No state change'};
 // Turning ON is safe only when a verified router can actually serve maintenance.
 if(!routingReady)return {allowed:false,reason:'Public routing not verified'};
 // Turning OFF must additionally require an explicitly approved public release.
 if(requested===false&&!releaseApproved)
  return {allowed:false,reason:'No approved public release'};
 return {allowed:true,reason:'Authorized transition candidate'};
}
