// Ctoons Shop inventory intentionally cleared at the owner's request.
// No demo Ctoons, transactions, currency changes, or account writes.
const list=document.getElementById('Ctoons');
const status=document.getElementById('result-count');
const search=document.getElementById('search');
const series=document.getElementById('series');
const empty=document.createElement('p');
empty.className='empty';
empty.textContent='No Ctoons available yet. New Ctoons will appear here when added.';
// All Ctoon listings share this purple arcade card component.
function createCtoonCard(ctoon){
 const card=document.createElement('article');card.className='pack';
 const art=document.createElement('div');art.className='pack-art';
 const badge=document.createElement('span');badge.className='ownership';badge.textContent='Unowned';
 const symbol=document.createElement('span');symbol.className='emoji';symbol.textContent=ctoon.fallback||'✦';
 art.append(badge,symbol);
 if(ctoon.image){const img=document.createElement('img');img.src=ctoon.image;img.alt=ctoon.name;img.addEventListener('load',()=>symbol.remove());img.addEventListener('error',()=>img.remove());art.append(img);}
 const name=document.createElement('h2');name.textContent=ctoon.name;
 const detail=document.createElement('p');detail.className='meta';detail.textContent=ctoon.type||'Ctoon';
 const row=document.createElement('div');row.className='price-row';
 const price=document.createElement('p');price.className='price';price.textContent=ctoon.price==null?'Price TBD':ctoon.price+' pts';
 const buy=document.createElement('button');buy.className='buy';buy.disabled=true;buy.textContent='Buy';buy.title='Purchases are not enabled in this preview';
 row.append(price,buy);card.append(art,name,detail,row);return card;
}
const item=createCtoonCard({name:'Golden Tiger Claws',type:'Ctoon',fallback:'🐯',image:'./assets/ctoons/golden-tiger-claws.png',price:null});
function show(section){
 list.replaceChildren();
 if(section==='all'||section==='new')list.append(item);
 else {empty.textContent=section==='series'?'Series assignments coming soon.':'No featured Ctoons yet.';list.append(empty);}
 status.textContent=(section==='all'||section==='new'?'1':'0')+' Ctoons';
}
show('all');
search.value='';
search.disabled=true;
series.value='';
series.disabled=true;

const tabs=[...document.querySelectorAll('[role="tab"]')];
const panel=document.getElementById('shop-panel');
const messages={all:'No Ctoons available yet. New Ctoons will appear here when added.',series:'No series have Ctoons listed yet.',new:'No new arrivals yet.',featured:'No featured Ctoons yet.'};
function activate(tab){
 for(const item of tabs){item.setAttribute('aria-selected',String(item===tab));item.tabIndex=item===tab?0:-1;}
 panel.setAttribute('aria-labelledby',tab.id);
 show(tab.dataset.section);
}
tabs.forEach((tab,index)=>{
 tab.tabIndex=index===0?0:-1;
 tab.addEventListener('click',()=>activate(tab));
 tab.addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  activate(tabs[next]);tabs[next].focus();
 });
});
