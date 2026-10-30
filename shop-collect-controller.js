(() => {
 const grid=document.getElementById('collect-sticker-grid');
 const count=document.getElementById('registry-count');
 const seriesCount=document.getElementById('series-count');
 const published=document.getElementById('library-published-count');
 fetch('sticker-catalog.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Catalog unavailable');return response.json()}).then(data=>{
  const series=Array.isArray(data.series)?data.series:[];
  const ctoons=Array.isArray(data.stickers)?data.stickers:[];
  seriesCount.textContent=String(series.length);
  published.textContent=String(ctoons.filter(item=>item.published===true).length);
  count.textContent=ctoons.length+' Ctoons recorded';
  if(series.length){const shelf=document.getElementById('series-empty');shelf.replaceChildren();for(const item of series){const p=document.createElement('p');p.textContent=item.name;shelf.append(p)}}
  if(ctoons.length){grid.replaceChildren();for(const item of ctoons){const p=document.createElement('p');p.textContent=item.name;grid.append(p)}}
 }).catch(()=>{count.textContent='Ctoon catalog unavailable';});
})();
