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
 // Validate the entire snapshot before owner bypass. The review HTTP gateway
 // already does this, but the pure policy must be safe when reused elsewhere.
 // A missing, extra or malformed section can never authorize any route.
 if(typeof globalMaintenance!=='boolean'||!sectionStatuses||
    typeof sectionStatuses!=='object'||Array.isArray(sectionStatuses)||
    Object.keys(sectionStatuses).length!==SECTION_KEYS.length||
    !SECTION_KEYS.every(key=>hasOwn(sectionStatuses,key)&&typeof sectionStatuses[key]==='boolean'))
  return {allowed:false,reason:'maintenance-state-unavailable'};
 if(verifiedOwner===true)return {allowed:true,reason:'verified-owner'};
 if(globalMaintenance)return {allowed:false,reason:'global-maintenance'};
 if(sectionStatuses[section])return {allowed:false,reason:'section-maintenance'};
 return {allowed:true,reason:'available'};
}
