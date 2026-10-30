(() => {
 const params=new URLSearchParams(location.search);
 const id=params.get('set');
 const subId=params.get('subseries');
 const title=document.getElementById('set-title');
 const summary=document.getElementById('set-summary');
 const section=document.getElementById('set-section');
 const grid=document.getElementById('set-grid');
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
   title.textContent=sub.name;summary.textContent='Coming Soon · 0 Ctoons';section.textContent='Ctoon Collection';
   const items=(data.stickers||[]).filter(x=>x.subseries===sub.id && (x.series===set.name||x.setId===set.id));
   if(!items.length){showMessage('No Ctoons have been added to this subseries yet.');return}
   for(const item of items){const card=document.createElement('article');card.className='sub-card';const h=document.createElement('h3');h.textContent=item.name;card.append(h);grid.append(card)}
   summary.textContent=items.length+' Ctoons';return
  }
  title.textContent=set.name;summary.textContent=subs.length+' subseries · Coming Soon';section.textContent='Subseries';
  if(!subs.length){showMessage('No subseries have been added yet.');return}
  for(const sub of [...subs].sort((a,b)=>a.name.localeCompare(b.name))){const a=document.createElement('a');a.className='sub-card';a.href='shop-collect-series.html?set='+encodeURIComponent(id)+'&subseries='+encodeURIComponent(sub.id);const h=document.createElement('h3');h.textContent=sub.name;const p=document.createElement('p');p.textContent='Coming Soon · 0 Ctoons';a.append(h,p);grid.append(a)}
 }).catch(()=>{title.textContent='Unable to load set';showMessage('The Ctoon catalog could not be loaded. Please try again.')});
})();
