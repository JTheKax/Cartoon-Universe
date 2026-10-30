import {sectionAccess} from './section-maintenance-policy.mjs';

// Review-only route catalog. These are explicit URL classifications, not a
// mounted gateway. Unknown paths, methods, and mutations remain denied.
const pages=Object.freeze({
 '/':'home','/index.html':'home','/login.html':'home',
 '/register.html':'home','/account.html':'home','/owner.html':'home',
 '/coin-wallet.html':'home','/explore':'explore',
 '/shop-collect.html':'explore','/shop-collect-my-collection.html':'explore',
 '/shop-collect-my-scene.html':'explore','/shop-collect-encyclopedia.html':'explore',
 '/shop-collect-wishlist.html':'explore',
 '/sticker-shop':'sticker-shop','/shop-collectibles.html':'sticker-shop',
 '/shop-packs.html':'sticker-shop','/shop-recycler.html':'sticker-shop',
 '/card-battle':'card-battle','/shop-cards.html':'card-battle',
 '/shop-cards-battle.html':'card-battle','/shop-cards-deck-build.html':'card-battle',
 '/games':'games','/shop-games.html':'games','/shop-games-arcade.html':'games',
 '/shop-games-prize-wheel.html':'games','/shop-games-claw-machine.html':'games',
 '/shop-games-monster-catcher.html':'games',
 '/retro-arcade':'retro-arcade','/shop-games-retro-games.html':'retro-arcade',
 '/player-shops':'player-shops','/shop-my-shop.html':'player-shops',
 '/shop-auctions.html':'player-shops','/radio':'radio',
 '/movie-theater':'movie-theater','/shop-watch.html':'movie-theater',
 '/shop-watch-cartoons.html':'movie-theater','/shop-watch-anime.html':'movie-theater',
 '/shop-watch-movies.html':'movie-theater','/shop-watch-misc.html':'movie-theater',
 '/community':'community','/shop-community.html':'community',
 '/shop-community-support.html':'community','/shop-community-forums.html':'community',
 '/shop-community-help.html':'community'
});
// Proposed mutation routes for future server handlers; no routes are enabled
// merely by appearing in this catalog. Every real mutation must be registered
// here and have its own authentication, CSRF, and RLS checks.
const mutations=Object.freeze({
 '/api/coins/transfer':'home',
 '/api/collect/open-pack':'sticker-shop',
 '/api/collect/trade':'explore',
 '/api/cards/battle':'card-battle',
 '/api/games/play':'games',
 '/api/retro/save':'retro-arcade',
 '/api/player-shops/listing':'player-shops',
 '/api/theater/schedule':'movie-theater',
 '/api/community/post':'community'
});
export const SECTION_PAGE_ROUTES=Object.freeze(Object.keys(pages));
export const SECTION_MUTATION_ROUTES=Object.freeze(Object.keys(mutations));
export function sectionForRoute({pathname,method='GET'}={}){
 if(typeof pathname!=='string'||!pathname.startsWith('/')||pathname.includes('?')||pathname.includes('#')||pathname.includes('%')||pathname.includes('\\')||pathname.includes('..')||pathname.includes('//'))return null;
 if(method==='GET'||method==='HEAD')return Object.hasOwn(pages,pathname)?pages[pathname]:null;
 if(method==='POST')return Object.hasOwn(mutations,pathname)?mutations[pathname]:null;
 return null;
}
export function guardSectionRoute({pathname,method='GET',globalMaintenance,sectionStatuses,verifiedOwner=false}={}){
 const section=sectionForRoute({pathname,method});
 if(!section)return {allowed:false,reason:'unmapped-route'};
 return sectionAccess({section,globalMaintenance,sectionStatuses,verifiedOwner});
}
