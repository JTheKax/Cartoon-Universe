// Display-only pack catalog. No purchases, currency writes or owned-sticker claims.
export const SERIES=Object.freeze([
 {id:'disney',name:'Disney',symbol:'🏰',accent:'#e78bff'},
 {id:'dragon-ball-z',name:'Dragon Ball Z',symbol:'🐉',accent:'#ffab3e'},
 {id:'family-guy',name:'Family Guy',symbol:'🏠',accent:'#7ac8ff'},
 {id:'futurama',name:'Futurama',symbol:'🚀',accent:'#78e4c7'},
 {id:'simpsons',name:'The Simpsons',symbol:'🍩',accent:'#ffe06b'},
 {id:'spongebob',name:'SpongeBob SquarePants',symbol:'🧽',accent:'#ffdb52'},
 {id:'xiaolin',name:'Xiaolin Showdown',symbol:'☯️',accent:'#ff6868'},
 {id:'misc',name:'Misc.',symbol:'🎮',accent:'#b8a5ff'}
]);
const $=id=>document.getElementById(id);
const select=$('series'),search=$('search'),list=$('packs');
for(const s of SERIES){const o=document.createElement('option');o.value=s.id;o.textContent=s.name;select.append(o);}
function render(){
 const q=search.value.trim().toLowerCase(),items=SERIES.filter(s=>(!select.value||s.id===select.value)&&s.name.toLowerCase().includes(q));
 $('result-count').textContent=items.length+' series available for preview';
 list.replaceChildren(...items.map(s=>{
  const card=document.createElement('article');card.className='pack';card.style.setProperty('--accent',s.accent);
  const art=document.createElement('div');art.className='pack-art';
  const emoji=document.createElement('span');emoji.className='emoji';emoji.textContent=s.symbol;
  const seal=document.createElement('span');seal.className='seal';seal.textContent='CARTOON UNIVERSE';
  art.append(emoji,seal);
  const h=document.createElement('h2');h.textContent=s.name+' Sticker Pack';
  const info=document.createElement('p');info.className='meta';info.textContent='Pack contents and sticker artwork coming soon';
  const price=document.createElement('p');price.className='price';price.textContent='Cartoon Coin price: TBD';
  const button=document.createElement('button');button.disabled=true;button.textContent='Coming soon';
  card.append(art,h,info,price,button);return card;
 }));
 if(!items.length){const p=document.createElement('p');p.className='empty';p.textContent='No matching series. Try a different search.';list.append(p);}
}
search.addEventListener('input',render);select.addEventListener('change',render);render();
