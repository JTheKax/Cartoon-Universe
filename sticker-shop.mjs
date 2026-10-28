// Ctoons Shop inventory intentionally cleared at the owner's request.
// No demo Ctoons, transactions, currency changes, or account writes.
const list=document.getElementById('Ctoons');
const status=document.getElementById('result-count');
const search=document.getElementById('search');
const series=document.getElementById('series');
const empty=document.createElement('p');
empty.className='empty';
empty.textContent='No Ctoons available yet. New Ctoons will appear here when added.';
list.replaceChildren(empty);
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
 empty.textContent=messages[tab.dataset.section];
 status.textContent='0 Ctoons';
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
