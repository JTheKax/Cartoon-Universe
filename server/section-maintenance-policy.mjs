// Pure review-only authorization decision helper. Not wired into production routing.
export const SECTION_KEYS=Object.freeze([
 'home','explore','sticker-shop','card-battle','games','retro-arcade',
 'player-shops','radio','movie-theater','community'
]);
const known=new Set(SECTION_KEYS);
const hasOwn=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);

// Only the server can supply verifiedOwner. Never trust a browser-supplied role.
// An absent or malformed global/section status always denies player access.
export function sectionAccess({section,globalMaintenance,sectionStatuses,verifiedOwner=false}={}){
 if(!known.has(section))return {allowed:false,reason:'unknown-section'};
 if(verifiedOwner===true)return {allowed:true,reason:'verified-owner'};
 if(globalMaintenance!==false)return {allowed:false,reason:'global-maintenance'};
 if(!sectionStatuses||typeof sectionStatuses!=='object'||Array.isArray(sectionStatuses)||!hasOwn(sectionStatuses,section))
  return {allowed:false,reason:'missing-section-status'};
 if(sectionStatuses[section]!==false)return {allowed:false,reason:'section-maintenance'};
 return {allowed:true,reason:'available'};
}
