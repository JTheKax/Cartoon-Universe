// Personal theme preferences stay in this browser; no account or game data is changed.
(() => {
 const key='cartoon-universe-background-theme';
 const builtIns={haunted:'Haunted Arcade',galaxy:'Cosmic Galaxy',neon:'Neon Arcade',midnight:'Midnight'};
 const allowed=new Set(Object.keys(builtIns));
 const images=new Map();
 const imageExtensions=/\.(?:png|jpe?g|webp|gif|avif)$/i;
 const backgroundName=filename=>filename.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').replace(/\b\w/g,s=>s.toUpperCase());
 let selected='haunted';
 try{selected=localStorage.getItem(key)||'haunted'}catch{}
 function apply(theme){
  if(!allowed.has(theme))return;
  selected=theme;
  const custom=images.get(theme);
  document.documentElement.dataset.backgroundTheme=custom?'custom':theme;
  if(custom)document.documentElement.style.setProperty('--custom-background','url("'+custom.url+'")');
  else document.documentElement.style.removeProperty('--custom-background');
  document.querySelectorAll('[data-theme-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===theme)));
  const status=document.getElementById('theme-status');
  if(status)status.textContent='Active background: '+(custom?custom.name:builtIns[theme]);
 }
 function save(theme){apply(theme);try{localStorage.setItem(key,theme)}catch{}}
 function renderCustom(){
  const grid=document.getElementById('custom-theme-grid');
  if(!grid)return;
  grid.replaceChildren();
  for(const [id,info] of images){
   const button=document.createElement('button');
   button.type='button';button.className='theme-option';button.dataset.themeChoice=id;
   button.setAttribute('aria-pressed',String(id===selected));
   const swatch=document.createElement('span');swatch.className='theme-swatch custom-theme-swatch';swatch.setAttribute('aria-hidden','true');
   swatch.style.backgroundImage='linear-gradient(#150b2755,#150b2755),url("'+info.url+'")';
   const title=document.createElement('strong');title.textContent=info.name;
   const desc=document.createElement('small');desc.textContent='From your static folder';
   button.append(swatch,title,desc);
   button.addEventListener('click',()=>save(id));
   grid.append(button);
  }
  const note=document.getElementById('custom-theme-note');
  if(note)note.textContent=images.size?images.size+' custom background'+(images.size===1?'':'s')+' found in static.':'No custom background images found in static yet.';
 }
 // Read the public GitHub static directory so newly uploaded images appear without editing code.
 async function loadCustom(){
  const note=document.getElementById('custom-theme-note');
  try{
   const response=await fetch('https://api.github.com/repos/JTheKax/Cartoon-Universe/contents/static?ref=main',{headers:{Accept:'application/vnd.github+json'}});
   if(!response.ok)throw Error('Directory unavailable');
   const entries=await response.json();
   if(!Array.isArray(entries))throw Error('Invalid directory');
   for(const entry of entries){
    if(entry.type!=='file'||!imageExtensions.test(entry.name)||entry.name.toLowerCase()==='haunted-arcade.gif')continue;
    const id='custom:'+entry.name;
    const url='static/'+encodeURIComponent(entry.name);
    allowed.add(id);images.set(id,{name:backgroundName(entry.name),url});
   }
   renderCustom();
   if(allowed.has(selected))apply(selected);
   else apply('haunted');
  }catch{
   if(note)note.textContent='Custom backgrounds could not be loaded right now. Built-in themes are still available.';
   if(!allowed.has(selected))apply('haunted');
  }
 }
 // Prevent an unvalidated saved filename from being injected into CSS.
 apply(allowed.has(selected)?selected:'haunted');
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-theme-choice]').forEach(button=>button.addEventListener('click',()=>save(button.dataset.themeChoice)));
  document.getElementById('theme-reset')?.addEventListener('click',()=>{apply('haunted');try{localStorage.removeItem(key)}catch{}});
  loadCustom();
 });
})();
