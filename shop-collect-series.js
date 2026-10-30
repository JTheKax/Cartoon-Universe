(() => {
 const params=new URLSearchParams(location.search);
 const id=params.get('set');
 const subId=params.get('subseries');
 const title=document.getElementById('set-title');
 const summary=document.getElementById('set-summary');
 const section=document.getElementById('set-section');
 const grid=document.getElementById('set-grid');
 const logoThemes={
 'camp-lazlo':['⛺','#3d8759','#173d3b'],
 'class-of-3000':['♫','#d68b38','#5b285b'],
 'courage-the-cowardly-dog':['✦','#e48bb8','#422452'],
 'danny-phantom':['◈','#64dfad','#173a43'],
 'dexters-laboratory':['⚗','#ff8b50','#4c254d'],
 'ed-edd-n-eddy':['✳','#e6bd56','#4b663b'],
 'fosters-home-for-imaginary-friends':['⌂','#8bc7f5','#4256a0'],
 'johnny-bravo':['★','#f2dc5a','#41315d'],
 'jimmy-neutron':['⚛','#e2a45b','#305d87'],
 'samurai-jack':['⚔','#e9e9db','#343d54'],
 'spongebob-squarepants':['✿','#f6e04f','#167b9d'],
 'the-fairly-oddparents':['✧','#ed91cb','#3c8b64'],
 'the-powerpuff-girls':['♥','#f8a8cc','#3c6ca8'],
 'xiaolin-showdown':['☯','#e9ad58','#8b343c']
 };
 const verifiedLogos={
  'dexters-laboratory':'Dexter-logo.png',
  'courage-the-cowardly-dog':'Courage_the_Cowardly_Dog_logo.png'
 };
 const logoImage=(sub,logo)=>{
  const img=document.createElement('img');img.className='official-series-logo';img.alt=sub.name+' television series logo';img.loading='lazy';img.referrerPolicy='no-referrer';
  img.onerror=()=>{img.remove();logo.classList.remove('has-official-logo')};
  img.src='https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(verifiedLogos[sub.id]);
  logo.classList.add('has-official-logo');logo.prepend(img)
 };
 const makeLogo=(sub)=>{const [symbol,accent,bg]=logoThemes[sub.id]||['✦','#a8e9ff','#34486b'];const logo=document.createElement('div');logo.className='subseries-logo';logo.style.setProperty('--logo-accent',accent);logo.style.setProperty('--logo-bg',bg);logo.setAttribute('role','img');logo.setAttribute('aria-label',sub.name+' custom Ctoon collection logo');const mark=document.createElement('span');mark.className='subseries-logo-symbol';mark.setAttribute('aria-hidden','true');mark.textContent=symbol;const name=document.createElement('strong');name.className='subseries-logo-name';name.textContent=sub.name;logo.append(mark,name);if(verifiedLogos[sub.id]){logoImage(sub,logo)}else{
   const search='https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch='+encodeURIComponent('intitle:'+sub.name+' logo')+'&gsrnamespace=6&gsrlimit=15&prop=imageinfo&iiprop=url&iiurlwidth=520&format=json&origin=*';
   fetch(search).then(r=>r.json()).then(data=>{
    const pages=Object.values(data.query?.pages||{});
    const normalize=x=>x.toLowerCase().replace(/[^a-z0-9]/g,'');
    const target=normalize(sub.name);
    const match=pages.find(p=>{const t=normalize(p.title.replace(/^File:/i,'').replace(/\.(svg|png|jpg|jpeg|webp)$/i,''));return t.includes(target)&&t.includes('logo')&&p.imageinfo?.[0]?.thumburl});
    if(!match)return;
    const img=document.createElement('img');img.className='official-series-logo';img.alt=sub.name+' television series logo';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>{img.remove();logo.classList.remove('has-official-logo')};img.src=match.imageinfo[0].thumburl;logo.classList.add('has-official-logo');logo.prepend(img)
   }).catch(()=>{});
  }return logo};
 const showMessage=(message)=>{const p=document.createElement('p');p.className='set-empty';p.textContent=message;grid.replaceChildren(p)};
 fetch('sticker-catalog.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catalog unavailable');return r.json()}).then(data=>{
  const set=(data.series||[]).find(s=>s.id===id);
  if(!set){title.textContent='Set not found';summary.textContent='Choose a set from Sets Overview.';showMessage('This Ctoon set is unavailable.');return}
  document.title=set.name+' | Cartoon Universe';
  const subs=Array.isArray(set.subseries)?set.subseries:[];
  if(subId){
   const sub=subs.find(s=>s.id===subId);
   if(!sub){title.textContent='Subseries not found';showMessage('This subseries is unavailable.');return}
   const back=document.createElement('a');back.href='shop-collect-series.html?set='+encodeURIComponent(id);back.textContent='← Back to '+set.name;back.className='set-back';grid.before(back);
   title.textContent=sub.name;document.querySelector('.set-head').append(makeLogo(sub));summary.textContent='Coming Soon · 0 Ctoons';section.textContent='Ctoon Collection';
   const items=(data.stickers||[]).filter(x=>x.subseries===sub.id && (x.series===set.name||x.setId===set.id));
   if(!items.length){showMessage('No Ctoons have been added to this subseries yet.');return}
   for(const item of items){const card=document.createElement('article');card.className='sub-card';const h=document.createElement('h3');h.textContent=item.name;card.append(h);grid.append(card)}
   summary.textContent=items.length+' Ctoons';return
  }
  title.textContent=set.name;summary.textContent=subs.length+' subseries · Coming Soon';section.textContent='Subseries';
  if(!subs.length){showMessage('No subseries have been added yet.');return}
  for(const sub of [...subs].sort((a,b)=>a.name.localeCompare(b.name))){const a=document.createElement('a');a.className='sub-card';a.href='shop-collect-series.html?set='+encodeURIComponent(id)+'&subseries='+encodeURIComponent(sub.id);const h=document.createElement('h3');h.textContent=sub.name;const p=document.createElement('p');p.textContent='Coming Soon · 0 Ctoons';a.prepend(makeLogo(sub));a.append(h,p);grid.append(a)}
 }).catch(()=>{title.textContent='Unable to load set';showMessage('The Ctoon catalog could not be loaded. Please try again.')});
})();
