// Browser-local appearance selection; custom theme CSS is indexed from assets/themes.
(() => {
 const key='cartoon-universe-background-theme';
 const builtin={haunted:'Haunted Arcade',galaxy:'Cosmic Galaxy',neon:'Neon Arcade',midnight:'Midnight'};
 let selected='haunted';try{selected=localStorage.getItem(key)||'haunted'}catch{}
 const preferredOnLoad=selected;
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.id='cu-custom-theme-css';
 function apply(theme){
  const entries=window.cartoonUniverseThemes||[];
  const item=entries.find(x=>x.id===theme);
  const isBuiltIn=Object.hasOwn(builtin,theme);
  if(!isBuiltIn&&!item)theme='haunted';
  const custom=!isBuiltIn&&item&&item.kind==='file';
  document.documentElement.dataset.backgroundTheme=custom?'custom':theme;
  if(custom){stylesheet.href=item.path;if(!stylesheet.isConnected)document.head.append(stylesheet)}
  else{stylesheet.remove();stylesheet.removeAttribute('href')}
  selected=theme;
  document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===theme)));
  const status=document.getElementById('theme-status');
  if(status)status.textContent='Active background: '+(isBuiltIn?builtin[theme]:(item?.name||'Haunted Arcade'))+' · Browser preference';
 }
 const save=theme=>{apply(theme);try{localStorage.setItem(key,selected)}catch{}};
 document.addEventListener('cu-select-theme',e=>save(e.detail?.id||'haunted'));
 document.addEventListener('cu-appearance-catalog-ready',()=>apply(preferredOnLoad));
 document.addEventListener('DOMContentLoaded',()=>{
  apply(selected);
  document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>save(b.dataset.themeChoice)));
  const reset=document.getElementById('theme-reset');
  if(reset)reset.addEventListener('click',()=>{save('haunted');try{localStorage.removeItem(key)}catch{}});
 });
 apply(selected);
})();
