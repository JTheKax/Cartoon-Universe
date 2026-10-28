// Sticker Shop inventory intentionally cleared at the owner's request.
// No demo packs, transactions, currency changes, or account writes.
const list=document.getElementById('packs');
const status=document.getElementById('result-count');
const search=document.getElementById('search');
const series=document.getElementById('series');
const empty=document.createElement('p');
empty.className='empty';
empty.textContent='No sticker packs available yet. New packs will appear here when added.';
list.replaceChildren(empty);
status.textContent='0 sticker packs';
search.value='';
search.disabled=true;
series.value='';
series.disabled=true;
