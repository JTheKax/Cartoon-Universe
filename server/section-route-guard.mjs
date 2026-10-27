import {sectionAccess} from './section-maintenance-policy.mjs';

// Review-only route policy: server handlers must call this before serving a page
// or processing a mutation. It does not replace authentication or database RLS.
const routes=Object.freeze({
 '/':'home','/index.html':'home','/explore':'explore',
 '/sticker-shop':'sticker-shop','/card-battle':'card-battle',
 '/games':'games','/retro-arcade':'retro-arcade',
 '/player-shops':'player-shops','/radio':'radio',
 '/movie-theater':'movie-theater','/community':'community'
});
export function guardSectionRoute({pathname,globalMaintenance,sectionStatuses,verifiedOwner=false}={}){
 if(typeof pathname!=='string'||!Object.hasOwn(routes,pathname))return {allowed:false,reason:'unmapped-route'};
 return sectionAccess({section:routes[pathname],globalMaintenance,sectionStatuses,verifiedOwner});
}
