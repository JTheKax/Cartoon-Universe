// Browser-local appearance selection; custom theme CSS is indexed from assets/themes.
(() => {
 const key='cartoon-universe-background-theme';
 const builtin={galaxy:'Cosmic Galaxy',neon:'Neon Arcade',midnight:'Midnight'};
 let selected='neon';try{selected=localStorage.getItem(key)||'neon'}catch{}
 if(selected==='haunted')selected='neon';
 const preferredOnLoad=selected;
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.id='cu-custom-theme-css';
 function apply(theme){
  const entries=window.cartoonUniverseThemes||[];
  const item=entries.find(x=>x.id===theme);
  const isBuiltIn=Object.hasOwn(builtin,theme);
  if(theme==='haunted'||(!isBuiltIn&&!item))theme='neon';
  const custom=!isBuiltIn&&item&&item.kind==='file';
  document.documentElement.dataset.backgroundTheme=custom?'custom':theme;
  if(custom){stylesheet.href=item.path;if(!stylesheet.isConnected)document.head.append(stylesheet)}
  else{stylesheet.remove();stylesheet.removeAttribute('href')}
  selected=theme;
  document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===theme)));
  const status=document.getElementById('theme-status');
  if(status)status.textContent='Active background: '+(isBuiltIn?builtin[theme]:(item?.name||'Neon Arcade'))+' · Browser preference';
 }
 const save=theme=>{apply(theme);try{localStorage.setItem(key,selected)}catch{}};
 document.addEventListener('cu-select-theme',e=>save(e.detail?.id||'neon'));
 document.addEventListener('cu-appearance-catalog-ready',()=>apply(preferredOnLoad));
 document.addEventListener('DOMContentLoaded',()=>{
  apply(selected);
  document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>save(b.dataset.themeChoice)));
  const reset=document.getElementById('theme-reset');
  if(reset)reset.addEventListener('click',()=>{save('neon');try{localStorage.removeItem(key)}catch{}});
 });
 apply(selected);
})();

/* Shared navigation on standalone preview pages; main homepage remains unchanged. */
document.addEventListener('DOMContentLoaded',()=>{
 if(document.querySelector('#nav')||!document.querySelector('.arcade-destination'))return;
 const header=document.createElement('header');
 header.className='cu-shared-header';
 header.innerHTML="<div class=\"cu-shared-brand\"><a href=\"index.html\">CARTOON UNIVERSE</a><span>PLAY · COLLECT · TRADE · COMPETE</span></div><div class=\"header-nav-row\"><nav id=\"nav\" aria-label=\"Main navigation\"><a href=\"index.html\">HOME</a><details class=\"cu-nav-dropdown\"><summary>COLLECT <span aria-hidden=\"true\">⌄</span></summary><div class=\"cu-nav-options\"><a href=\"shop-collect.html\">Sets Overview</a><a href=\"shop-collect-my-collection.html\">My Collection</a><a href=\"shop-collect-my-scene.html\">My Scene</a><a href=\"shop-collect-encyclopedia.html\">Encyclopedia</a><a href=\"shop-collect-wishlist.html\">Wishlist</a></div></details><details class=\"cu-nav-dropdown\"><summary>SHOP <span aria-hidden=\"true\">⌄</span></summary><div class=\"cu-nav-options\"><a href=\"shop-shop.html\">Shop Hub</a><a href=\"shop-collectibles.html\">Collectibles</a><a href=\"shop-packs.html\">Packs</a><a href=\"shop-my-shop.html\">My Shop</a><a href=\"shop-auctions.html\">Auctions</a><a href=\"shop-recycler.html\">Recycler</a></div></details><details class=\"cu-nav-dropdown\"><summary>CARDS <span aria-hidden=\"true\">⌄</span></summary><div class=\"cu-nav-options\"><a href=\"shop-cards.html\">Cards Overview</a><a href=\"shop-cards-battle.html\">Battle</a><a href=\"shop-cards-deck-build.html\">Deck Build</a></div></details><details class=\"cu-nav-dropdown\"><summary>GAMES <span aria-hidden=\"true\">⌄</span></summary><div class=\"cu-nav-options\"><a href=\"shop-games.html\">Games Overview</a><a href=\"shop-games-retro-games.html\">Retro Games</a><a href=\"shop-games-monster-catcher.html\">Monster Catcher</a><a href=\"shop-games-arcade.html\">Arcade</a><a href=\"shop-games-prize-wheel.html\">Prize Wheel</a><a href=\"shop-games-claw-machine.html\">Claw Machine</a></div></details><details class=\"cu-nav-dropdown\"><summary>WATCH <span aria-hidden=\"true\">⌄</span></summary><div class=\"cu-nav-options\"><a href=\"shop-watch.html\">Watch Overview</a><a href=\"shop-watch-cartoons.html\">Cartoons</a><a href=\"shop-watch-anime.html\">Anime</a><a href=\"shop-watch-movies.html\">Movies</a><a href=\"shop-watch-misc.html\">Misc</a></div></details><details class=\"cu-nav-dropdown\"><summary>COMMUNITY <span aria-hidden=\"true\">⌄</span></summary><div class=\"cu-nav-options\"><a href=\"shop-community.html\">Community Overview</a><a href=\"shop-community-support.html\">Support</a><a href=\"shop-community-forums.html\">Forums</a><a href=\"shop-community-help.html\">Help</a></div></details><a href=\"account.html\">ACCOUNT</a></nav></div>";
 document.body.prepend(header);
 document.querySelectorAll('.arcade-destination > nav.cmart-tabs').forEach(el=>el.remove());
});
