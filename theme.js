// Background preferences are local to this browser; no player data is modified.
(() => {
 const key='cartoon-universe-background-theme';
 const themes=new Set(['haunted','galaxy','neon','midnight']);
 const apply=(theme)=>{
  const selected=themes.has(theme)?theme:'haunted';
  document.documentElement.dataset.backgroundTheme=selected;
  document.querySelectorAll('[data-theme-choice]').forEach(button=>{
   const active=button.dataset.themeChoice===selected;
   button.setAttribute('aria-pressed',String(active));
  });
  const status=document.getElementById('theme-status');
  if(status)status.textContent='Active background: '+({haunted:'Haunted Arcade',galaxy:'Cosmic Galaxy',neon:'Neon Arcade',midnight:'Midnight'}[selected]);
 };
 let selected='haunted';
 try{selected=localStorage.getItem(key)||'haunted'}catch{}
 apply(selected);
 document.addEventListener('cu-select-theme',event=>{ const id=event.detail?.id; if(!themes.has(id))return; selected=id;apply(selected);try{localStorage.setItem(key,selected)}catch{} });
 document.addEventListener('DOMContentLoaded',()=>{
  apply(selected);
  document.querySelectorAll('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>{
   selected=button.dataset.themeChoice;
   apply(selected);
   try{localStorage.setItem(key,selected)}catch{}
  }));
  const reset=document.getElementById('theme-reset');
  if(reset)reset.addEventListener('click',()=>{
   selected='haunted';apply(selected);
   try{localStorage.removeItem(key)}catch{}
  });
 });
})();
