// Ctoons Shop inventory intentionally cleared at the owner's request.
// No demo Ctoons, transactions, currency changes, or account writes.
const list=document.getElementById('Ctoons');
const status=document.getElementById('result-count');
const search=document.getElementById('search');
const series=document.getElementById('series');
const empty=document.createElement('p');
empty.className='empty';
empty.textContent='No Ctoons available yet. New Ctoons will appear here when added.';
const item=document.createElement('article');
item.className='pack';
item.style.setProperty('--accent','#e4b73d');
const art=document.createElement('div');art.className='pack-art';
art.setAttribute('aria-label','Golden Tiger Claws artwork awaiting upload');
const symbol=document.createElement('span');symbol.className='emoji';symbol.textContent='🐯';
art.append(symbol);
const name=document.createElement('h2');name.textContent='Golden Tiger Claws';
const detail=document.createElement('p');detail.className='meta';detail.textContent='Ctoon · Artwork pending upload · 182 × 282';
const price=document.createElement('p');price.className='price';price.textContent='Cartoon Coin price: TBD';
const buy=document.createElement('button');buy.disabled=true;buy.textContent='Coming soon';
item.append(art,name,detail,price,buy);
function show(section){
 list.replaceChildren();
 if(section==='all'||section==='new')list.append(item);
 else {empty.textContent=section==='series'?'Series assignments coming soon.':'No featured Ctoons yet.';list.append(empty);}
 status.textContent=(section==='all'||section==='new'?'1':'0')+' Ctoons';
}
show('all');
status.textContent='0 Ctoons';
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
