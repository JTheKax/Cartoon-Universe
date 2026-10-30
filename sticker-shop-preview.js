const root=document.getElementById('sticker-shop-grid');
const search=document.getElementById('sticker-shop-search');
const filter=document.getElementById('sticker-shop-series');
const singles=document.getElementById('sticker-view-singles');
const packs=document.getElementById('sticker-view-packs');
const prices={Common:50,Uncommon:100,Rare:200,Epic:400,Legendary:750,Secret:1200};
let items=[],mode='singles';
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function previewButton(text){const b=el('button',text);b.type='button';b.disabled=true;b.title='Secure Cartoon Coin checkout is not enabled yet';return b;}
function render(){
 const q=search.value.trim().toLowerCase(),series=filter.value;
 singles.setAttribute('aria-pressed',String(mode==='singles'));packs.setAttribute('aria-pressed',String(mode==='packs'));
 root.replaceChildren();
 if(mode==='packs'){
  const groups=[...new Set(items.map(s=>s.series))].sort().filter(x=>!series||x===series).filter(x=>!q||x.toLowerCase().includes(q));
  if(!groups.length){root.append(el('p','No sticker packs match these filters.'));return;}
  for(const name of groups){
   const group=items.filter(s=>s.series===name),card=el('article',undefined,'sticker-preview-card');
   const heading=el('h3',name+' Sticker Pack');const art=el('div','🎁','pack-art');art.style.cssText='display:grid;place-items:center;font-size:70px;min-height:155px;background:linear-gradient(135deg,#0b3760,#622a9b);border-radius:12px';
   const detail=el('p','5 random stickers · '+group.length+' catalog sticker'+(group.length===1?'':'s')+' in this series');
   const price=el('p','🪙 350 Cartoon Coins','sticker-price');
   const note=el('p','Preview pricing · odds and contents require approval');
   card.append(art,heading,detail,price,note,previewButton('Buy Pack · Coming Soon'));root.append(card);
  }
 }else{
  const shown=items.filter(s=>(!series||s.series===series)&&(!q||(s.name+' '+s.series).toLowerCase().includes(q)));
  if(!shown.length){root.append(el('p','No stickers match these filters.'));return;}
  for(const s of shown){
   const card=el('article',undefined,'sticker-preview-card');
   const img=document.createElement('img');img.src=s.image;img.alt=s.name+' sticker artwork';img.loading='lazy';
   const price=prices[s.rarity]??100;
   card.append(img,el('h3',s.name),el('p',s.series+' · '+s.rarity),el('p','🪙 '+price+' Cartoon Coins','sticker-price'),previewButton('Buy Sticker · Coming Soon'));root.append(card);
  }
 }
}
async function init(){
 try{
  const response=await fetch('sticker-catalog.json',{cache:'no-store'});if(!response.ok)throw Error('Catalog unavailable');
  const catalog=await response.json();items=Array.isArray(catalog.stickers)?catalog.stickers.filter(s=>s.image&&s.name&&s.series):[];
  for(const name of [...new Set(items.map(s=>s.series))].sort())filter.add(new Option(name,name));
  render();
 }catch{root.textContent='Sticker Store catalog is temporarily unavailable.';}
}
singles.addEventListener('click',()=>{mode='singles';render()});
packs.addEventListener('click',()=>{mode='packs';render()});
search.addEventListener('input',render);filter.addEventListener('change',render);init();
