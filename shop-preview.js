/* Original demo items only; this preview does not query or mutate wallets or inventory. */
(() => {
 const items=[
 ['Pixel Pal','Arcade Originals','Common',75,'👾','item'],['Star Hopper','Space Adventures','Uncommon',125,'🚀','item'],['Moon Muncher','Space Adventures','Rare',250,'🌙','item'],['Pumpkin Prankster','Spooky Specials','Common',100,'🎃','item'],['Ghostly Gamer','Spooky Specials','Very Rare',500,'👻','item'],['Joystick Hero','Arcade Originals','Rare',225,'🕹️','item'],['Cosmic Cat','Space Adventures','Very Rare',450,'🐈','item'],['Witchy Whirl','Spooky Specials','Uncommon',175,'🧙','item'],['Arcade Starter Pack','Arcade Originals','Common',300,'🎁','pack'],['Spooky Mystery Pack','Spooky Specials','Rare',650,'📦','pack'],['Galaxy Surprise Pack','Space Adventures','Rare',600,'🪐','pack'],['Golden Trophy','Arcade Originals','Prize Only',0,'🏆','item']
 ];
 const $=id=>document.getElementById(id), grid=$('cmart-grid');if(!grid)return;
 let rarity='all',category='all';
 function render(){
  const term=$('cmart-search').value.trim().toLowerCase(),series=$('cmart-series').value,price=$('cmart-price').value;
  let filtered=items.filter(([name,s,r,c,,kind])=>(name.toLowerCase().includes(term))&&(rarity==='all'||r===rarity)&&(series==='all'||s===series)&&(price===''||c<=Number(price))&&(category==='all'||kind===category));
  const sort=$('cmart-sort').value;
  if(sort==='price-asc')filtered.sort((a,b)=>a[3]-b[3]);if(sort==='price-desc')filtered.sort((a,b)=>b[3]-a[3]);if(sort==='name')filtered.sort((a,b)=>a[0].localeCompare(b[0]));
  grid.replaceChildren();
  filtered.forEach(([name,series,r,c,emoji,kind])=>{
   const card=document.createElement('article');card.className='cmart-item';
   const art=document.createElement('div');art.className='cmart-item-art';art.setAttribute('aria-hidden','true');art.textContent=emoji;
   const flag=document.createElement('span');flag.className='cmart-item-flag';flag.textContent='Preview';art.append(flag);
   const title=document.createElement('h3');title.textContent=name;
   const meta=document.createElement('div');meta.className='cmart-item-meta';meta.textContent=series;
   const foot=document.createElement('div');foot.className='cmart-item-foot';
   const cost=document.createElement('strong');cost.textContent=r==='Prize Only'?'Prize only':c+' Coins';
   const tag=document.createElement('span');tag.textContent=r;tag.className='cmart-rarity';
   foot.append(cost,tag);card.append(art,title,meta,foot);grid.append(card);
  });
  $('cmart-count').textContent=filtered.length+' items';$('cmart-empty').hidden=filtered.length!==0;
 }
 ['cmart-search','cmart-series','cmart-price','cmart-sort'].forEach(id=>$(id).addEventListener('input',render));
 $('cmart-rarities').addEventListener('click',e=>{const b=e.target.closest('button[data-rarity]');if(!b)return;rarity=b.dataset.rarity;$('cmart-rarities').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render()});
 document.querySelectorAll('.cmart-tabs button[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('.cmart-tabs button[data-category]').forEach(x=>x.classList.toggle('active',x===b));render()}));
 $('cmart-reset').addEventListener('click',()=>{$('cmart-search').value='';$('cmart-series').value='all';$('cmart-price').value='';$('cmart-sort').value='featured';rarity='all';$('cmart-rarities').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x.dataset.rarity==='all'));render()});
 render();
})();