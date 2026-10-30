(() => {
 const seriesLink=document.getElementById('xiaolin-series-link');
 const futuramaLink=document.getElementById('futurama-series-link');
 const familyGuyLink=document.getElementById('family-guy-series-link');
 const dragonBallZLink=document.getElementById('dragon-ball-z-series-link');
 const disneyLink=document.getElementById('disney-series-link');
 const spongebobLink=document.getElementById('spongebob-series-link');
 const simpsonsLink=document.getElementById('simpsons-series-link');
 const miscLink=document.getElementById('misc-series-link');
 const filters={search:document.getElementById('collect-search'),series:document.getElementById('collect-series'),rarity:document.getElementById('collect-rarity'),ownership:document.getElementById('collect-ownership')};
 const grid=document.getElementById('collect-sticker-grid');
 const make=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
 const records=[]; // Include catalog previews in their series without enabling sales.
 const seriesCards=new Map([['disney','disney-series-link'],['dragon-ball-z','dragon-ball-z-series-link'],['family-guy','family-guy-series-link'],['futurama','futurama-series-link'],['spongebob-squarepants','spongebob-series-link'],['the-simpsons','simpsons-series-link'],['xiaolin-showdown','xiaolin-series-link'],['misc','misc-series-link']]);
 function applySeriesLogos(groups){
  if(!Array.isArray(groups))return;
  for(const group of groups){
   const card=document.getElementById(seriesCards.get(group.id));if(!card)continue;
   const art=card.querySelector('.library-card-art');if(!art)continue;
   if(typeof group.logo==='string'&&/^https:\/\//.test(group.logo)){
    const img=document.createElement('img');img.src=group.logo;img.alt=group.name+' series logo';img.loading='lazy';img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>{img.remove();if(!art.textContent.trim())art.textContent=group.name;});
    art.replaceChildren(img);
   }else{art.replaceChildren(document.createTextNode(group.name));}
  }
 }
 function render(){
  const q=filters.search.value.trim().toLowerCase();
  const matches=records.filter(x=>(filters.series.value==='all'||x.series===filters.series.value)&&(filters.rarity.value==='all'||x.rarity===filters.rarity.value)&&(filters.ownership.value==='all'||(x.owned===true?'owned':x.owned===false?'need':'unknown')===filters.ownership.value)&&[x.name,x.number].some(v=>String(v||'').toLowerCase().includes(q)));
  grid.replaceChildren();grid.className=matches.length?'library-cards':'library-empty';
  if(!matches.length){grid.append(make('strong','',records.length?'No stickers match your filters.':'No stickers recorded yet'));grid.append(make('p','',records.length?'Try changing the filters.':'All eight series are ready to track their stickers. No stickers have been entered yet.'))}
  matches.forEach(x=>{
   const card=make('article','library-card');
   const art=make('div','library-card-art');if(x.image){const img=make('img');img.src=x.image;img.alt=x.name;img.loading='lazy';img.style.cssText='width:100%;height:155px;object-fit:contain';art.append(img)}else art.textContent='🖼️';
   if(typeof x.owned==='boolean'){const badge=make('span','library-tag',x.owned?'✓ Owned':'✕ Need');badge.style.cssText='position:absolute;top:8px;right:8px;padding:4px 8px;background:#102d4c;border-radius:8px';art.style.position='relative';art.append(badge)}
   const info=make('div','library-card-info');info.append(make('span','library-tag',x.published===true?(x.number||'Unnumbered'):'Coming Soon'),make('h3','',x.name),make('p','',x.rarity||'Rarity pending'));card.append(art,info);grid.append(card)
  });
  document.getElementById('registry-count').textContent=matches.length+' of '+records.length+' stickers shown';
 }
 function updateCounts(){document.getElementById('dragon-ball-z-sticker-count').textContent=records.filter(x=>x.series==='Dragon Ball Z').length;const n=records.filter(x=>x.series==='Xiaolin Showdown').length;document.getElementById('xiaolin-sticker-count').textContent=n;document.getElementById('futurama-sticker-count').textContent=records.filter(x=>x.series==='Futurama').length;document.getElementById('family-guy-sticker-count').textContent=records.filter(x=>x.series==='Family Guy').length;document.getElementById('spongebob-sticker-count').textContent=records.filter(x=>x.series==='SpongeBob SquarePants').length;document.getElementById('disney-sticker-count').textContent=records.filter(x=>x.series==='Disney').length;document.getElementById('simpsons-sticker-count').textContent=records.filter(x=>x.series==='The Simpsons').length;document.getElementById('misc-sticker-count').textContent=records.filter(x=>x.series==='Misc.').length;document.getElementById('library-published-count').textContent=records.filter(x=>x.published===true).length}
 seriesLink.addEventListener('click',()=>{filters.series.value='Xiaolin Showdown';render()});
 futuramaLink.addEventListener('click',()=>{filters.series.value='Futurama';render()});
 familyGuyLink.addEventListener('click',()=>{filters.series.value='Family Guy';render()});
 dragonBallZLink.addEventListener('click',()=>{filters.series.value='Dragon Ball Z';render()});
 disneyLink.addEventListener('click',()=>{filters.series.value='Disney';render()});
 spongebobLink.addEventListener('click',()=>{filters.series.value='SpongeBob SquarePants';render()});
 simpsonsLink.addEventListener('click',()=>{filters.series.value='The Simpsons';render()});
 miscLink.addEventListener('click',()=>{filters.series.value='Misc.';render()});
 Object.values(filters).forEach(el=>el.addEventListener('input',render));
 fetch('sticker-catalog.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catalog unavailable');return r.json()}).then(data=>{if(!Array.isArray(data.stickers))throw Error('Invalid catalog');applySeriesLogos(data.series);records.push(...data.stickers.filter(x=>x&&typeof x.name==='string'&&typeof x.series==='string'&&data.series.some(group=>group.name===x.series)));updateCounts();render()}).catch(()=>{grid.replaceChildren(make('strong','','Sticker registry not available on this preview deployment.'));document.getElementById('registry-count').textContent='Registry data not loaded';});
 render();
})();
