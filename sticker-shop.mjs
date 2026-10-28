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
