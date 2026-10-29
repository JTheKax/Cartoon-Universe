const root=document.getElementById('sticker-shop-grid');
const search=document.getElementById('sticker-shop-search');
const filter=document.getElementById('sticker-shop-series');
let items=[];
function render(){
 const q=search.value.trim().toLowerCase(),series=filter.value;
 const shown=items.filter(s=>(!series||s.series===series)&&(!q||(s.name+' '+s.series).toLowerCase().includes(q)));
 root.replaceChildren();
 if(!shown.length){const p=document.createElement('p');p.textContent='No stickers match these filters.';root.append(p);return;}
 for(const s of shown){
  const card=document.createElement('article');card.className='sticker-preview-card';
  const img=document.createElement('img');img.src=s.image;img.alt=s.name+' sticker artwork';img.loading='lazy';
  const title=document.createElement('h3');title.textContent=s.name;
  const meta=document.createElement('p');meta.textContent=s.series+' · '+s.rarity;
  const status=document.createElement('p');status.textContent='Preview only · Not for sale';
  card.append(img,title,meta,status);root.append(card);
 }
}
async function init(){
 try{
  const response=await fetch('sticker-catalog.json',{cache:'no-store'});if(!response.ok)throw Error('Catalog unavailable');
  const catalog=await response.json();items=Array.isArray(catalog.stickers)?catalog.stickers.filter(s=>s.image&&s.name&&s.series):[];
  for(const series of [...new Set(items.map(s=>s.series))].sort()){filter.add(new Option(series,series));}
  render();
 }catch{root.textContent='Sticker previews are temporarily unavailable.';}
}
search.addEventListener('input',render);filter.addEventListener('change',render);init();
