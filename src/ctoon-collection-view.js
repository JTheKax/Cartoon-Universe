import {loadCtoonCollection} from './ctoon-collection.js';

// Supply an authenticated Supabase client; render using textContent to avoid HTML injection.
export async function renderCtoonCollection({supabase,root}) {
  root.replaceChildren();
  const state=await loadCtoonCollection(supabase);
  const heading=document.createElement('h2');heading.textContent='My Ctoon Collection';
  const summary=document.createElement('p');
  summary.textContent=state.authenticated
    ? `Owned: ${state.ownedCount} · Need: ${state.needCount} · Copies: ${state.totalCopies} · Duplicates: ${state.duplicateCount} · Complete: ${state.completionPercent}%`
    : 'Sign in to view your personal Owned and Need progress.';
  const filter=document.createElement('select');
  filter.setAttribute('aria-label','Ctoon ownership filter');
  for(const label of ['All','Owned','Need']) {
    const option=document.createElement('option');option.value=label;option.textContent=label;filter.append(option);
  }
  const list=document.createElement('ul');
  const draw=()=>{
    list.replaceChildren();
    const rows=state.items.filter(item=>filter.value==='All'||item.status===filter.value);
    for(const item of rows){
      const li=document.createElement('li');
      li.textContent=`${item.series}${item.subseries?' / '+item.subseries:''} — ${item.title} — ${state.authenticated?item.status+' (×'+item.quantity+')':'Sign in'}`;
      list.append(li);
    }
    if(!rows.length){const li=document.createElement('li');li.textContent='No Ctoons in this view.';list.append(li)}
  };
  filter.addEventListener('change',draw);
  root.append(heading,summary,filter,list);draw();
}
