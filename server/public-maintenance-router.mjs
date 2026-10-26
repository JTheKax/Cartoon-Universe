// Isolated routing decision engine. It never serves files or changes live configuration.
import {PUBLIC_FEATURES} from '../deploy/feature-status-preview/public-feature-status.mjs';
export function decidePublicRoute({pathname='/',masterMaintenance=true,routeStates={},routingConfirmed=false,ownerVerified=false}={}){
 if(typeof pathname!=='string'||!pathname.startsWith('/')||pathname.includes('\\')||pathname.includes('\0')||/%2f|%5c|%00/i.test(pathname))return {action:'maintenance',reason:'invalid_path'};
 const feature=PUBLIC_FEATURES.filter(item=>pathname===item.path||pathname.startsWith(item.path.endsWith('/')?item.path:item.path+'/')).sort((a,b)=>b.path.length-a.path.length)[0];
 // Root feature only matches /, never every nested route.
 const matched=feature?.id==='home'&&pathname!=='/'?undefined:feature;
 if(!routingConfirmed)return {action:'maintenance',reason:'unconfirmed_routing'};
 if(masterMaintenance)return ownerVerified?{action:'owner_preview',feature:matched?.id??null}:{action:'maintenance',reason:'master_maintenance',feature:matched?.id??null};
 if(!matched)return {action:'maintenance',reason:'unregistered_route'};
 if(routeStates[matched.id]==='live')return {action:'public',feature:matched.id};
 if(ownerVerified)return {action:'owner_preview',feature:matched.id};
 return {action:'maintenance',reason:routeStates[matched.id]==='maintenance'?'feature_maintenance':'unknown_state',feature:matched.id};
}
