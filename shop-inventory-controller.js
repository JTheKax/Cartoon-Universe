/* Preview-only catalog renderer. No mock inventory, writes, or transactions. */
(() => {
 let rows = [];
 const search = document.getElementById('inventory-search');
 const rarity = document.getElementById('inventory-rarity');
 const set = document.getElementById('inventory-set');
 const series = document.getElementById('inventory-series');
 const ownership = document.getElementById('inventory-ownership');
 const body = document.getElementById('inventory-table-body');
 const count = document.getElementById('inventory-count');
 const notice=document.createElement('p');notice.setAttribute('role','status');notice.textContent='Loading sticker catalog…';count.after(notice);
 const textCell = (row, value) => {const cell=document.createElement('td');cell.style.padding='14px';cell.textContent=String(value ?? '—');row.append(cell)};
 const render = () => {
  const q=search.value.trim().toLowerCase();
  const matching=rows.filter(x=>(ownership.value==='all'||(x.owned===true?'owned':x.owned===false?'unowned':'unknown')===ownership.value)&&(set.value==='all'||x.set===set.value)&&(series.value==='all'||x.series===series.value)&&(rarity.value==='all'||x.rarity===rarity.value)&&String(x.name).toLowerCase().includes(q));
  body.replaceChildren();
  if(!matching.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=8;td.style.cssText='padding:24px;text-align:center';td.textContent=rows.length?'No stickers match these filters.':'No stickers are currently listed for sale.';tr.append(td);body.append(tr)}
  for(const item of matching){const tr=document.createElement('tr');[item.name,item.series,item.set,item.rarity,item.price,item.quantity,item.status,item.owned===true?'Owned':item.owned===false?'Need':'Sign in to check'].forEach(v=>textCell(tr,v));body.append(tr)}
  count.textContent=matching.length+' sticker'+(matching.length===1?'':'s')+' listed';
 };
 const refreshSets=()=>{const names=[...new Set(rows.map(x=>x.set).filter(Boolean))].sort();set.replaceChildren(new Option('All sets','all'),new Option('Cartoons','Cartoons'),...names.filter(n=>n!=='Cartoons').map(n=>new Option(n,n)));const seriesNames=[...new Set(rows.map(x=>x.series).filter(Boolean))].sort();series.replaceChildren(new Option('All series','all'),new Option('Xiaolin Showdown','Xiaolin Showdown'),...seriesNames.filter(n=>n!=='Xiaolin Showdown').map(n=>new Option(n,n)));render()};
 [search,rarity,set,series,ownership].forEach(el=>el.addEventListener('input',render));
 refreshSets();
 fetch('./sticker-catalog.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Catalog unavailable');return r.json()}).then(data=>{
  rows=(Array.isArray(data.stickers)?data.stickers:[]).filter(x=>x&&typeof x.name==='string'&&typeof x.series==='string').map(x=>({name:x.name,series:x.series,set:x.set||'Series',rarity:x.rarity||'Unrated',price:x.price??'Not for sale',quantity:x.quantity??'—',status:x.status||'Catalog preview',owned:null}));
  notice.textContent=rows.length?'Catalog preview only — purchases and ownership are not enabled.':'No stickers have been published to the catalog.';
  refreshSets();
 }).catch(()=>{notice.textContent='Could not load the sticker catalog. Please try again later.';});
})();
