// Automatically loads available logo/theme options from the generated catalog.
// Files added under assets/logos or assets/themes are indexed by GitHub Actions.
(() => {
 const catalogUrl='assets/appearance-catalog.json';
 const baseLogos=[{id:'alternate',name:'Alternating (default)',kind:'built-in'},{id:'dragon',name:'Dragon Energy',kind:'built-in'},{id:'ninja',name:'Ninja Chakra',kind:'built-in'}];
 const baseThemes=[{id:'haunted',name:'Haunted Arcade',kind:'built-in'},{id:'galaxy',name:'Cosmic Galaxy',kind:'built-in'},{id:'neon',name:'Neon Arcade',kind:'built-in'},{id:'midnight',name:'Midnight',kind:'built-in'}];
 const safeId=s=>typeof s==='string'&&/^[a-z0-9][a-z0-9_-]*$/.test(s);
 const safePath=(p,dir,ext)=>typeof p==='string'&&new RegExp('^assets/'+dir+'/[a-zA-Z0-9_-]+\\.'+ext+'$').test(p);
 const label=x=>typeof x.name==='string'?x.name.slice(0,80):x.id;
 const valid=(x,kind)=>x&&safeId(x.id)&&x.kind==='file'&&safePath(x.path,kind,kind==='logos'?'(?:png|jpg|jpeg|webp|svg)':'css');
 const key='cartoon-universe-logo-mode';
 const read=()=>{try{return localStorage.getItem(key)||'alternate'}catch{return 'alternate'}};
 const write=v=>{try{localStorage.setItem(key,v)}catch{}};
 const allLogos=[...baseLogos],allThemes=[...baseThemes];
 function renderLogoOptions(){
  const holder=document.getElementById('owner-logo-options');if(!holder)return;
  holder.replaceChildren();
  for(const item of allLogos){
   const b=document.createElement('button');b.type='button';b.dataset.ownerLogo=item.id;b.textContent=item.name;
   b.addEventListener('click',()=>{write(item.id);applyLogo(item.id)});holder.append(b);
  }
 }
 function applyLogo(value){
  const item=allLogos.find(x=>x.id===value)||baseLogos[0];
  const mode=item.kind==='file'?'custom':item.id;
  document.documentElement.dataset.logoMode=mode;
  const brand=document.querySelector('.cu-animated-brand');
  if(brand){
   let image=brand.querySelector('.cu-custom-logo');
   if(item.kind==='file'){
    if(!image){image=document.createElement('img');image.className='cu-custom-logo';image.alt='Cartoon Universe';brand.append(image)}
    image.src=item.path;image.hidden=false;
   }else if(image){image.hidden=true;image.removeAttribute('src')}
  }
  document.querySelectorAll('[data-owner-logo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ownerLogo===item.id)));
  const status=document.getElementById('owner-logo-status');if(status)status.textContent='Selected logo: '+label(item)+' · Browser preview only';
 }
 function renderThemeOptions(){
  const holder=document.getElementById('owner-theme-options');if(!holder)return;
  holder.replaceChildren();
  for(const item of allThemes){
   const b=document.createElement('button');b.type='button';b.dataset.themeChoice=item.id;b.textContent=item.name;
   b.addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('cu-select-theme',{detail:{id:item.id}}))});holder.append(b);
  }
 }
 async function init(){
  try{
   const response=await fetch(catalogUrl,{cache:'no-store'});if(!response.ok)throw Error('catalog unavailable');
   const data=await response.json();
   for(const item of Array.isArray(data.logos)?data.logos:[])if(valid(item,'logos')&&!allLogos.some(x=>x.id===item.id))allLogos.push(item);
   for(const item of Array.isArray(data.themes)?data.themes:[])if(valid(item,'themes')&&!allThemes.some(x=>x.id===item.id))allThemes.push(item);
  }catch{}
  window.cartoonUniverseThemes=allThemes;
  renderLogoOptions();renderThemeOptions();
  const selected=read();if(!allLogos.some(x=>x.id===selected))write('alternate');
  applyLogo(read());
  document.dispatchEvent(new Event('cu-appearance-catalog-ready'));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
