// Owner dashboard review-only UI: no network calls or maintenance writes.
import {PUBLIC_FEATURES,resolvePublicFeatureStatus} from './deploy/feature-status-preview/public-feature-status.mjs';
const panel=document.getElementById('maintenance-feature-list');
const note=document.getElementById('maintenance-feature-note');
if(panel&&note){
 const preview={masterMaintenance:true,routeStates:Object.fromEntries(PUBLIC_FEATURES.map(f=>[f.id,'maintenance']))};
 // Only request this endpoint on an owner-authenticated, same-origin gateway.
 // It is not mounted in production; unavailable responses leave UNKNOWN.
 async function readOwnerStatus(){
  try{
   const response=await fetch('/__maintenance/owner/settings-preview',{method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)return;
   const data=await response.json();
   if(data?.readOnly!==true||!Array.isArray(data.features))return;
   const statuses=new Map(data.features.filter(f=>PUBLIC_FEATURES.some(x=>x.id===f.id)).map(f=>[f.id,f.status]));
   for(const row of panel.querySelectorAll('[data-feature-id]')){
    const status=row.querySelector('[data-effective-status]');
    if(status)status.textContent=' Effective status: '+(statuses.get(row.dataset.featureId)||'UNKNOWN');
   }
   note.textContent='Authenticated settings preview loaded. Controls remain local-only.';
  }catch{note.textContent='Live settings unavailable; preview controls remain local-only.'}
 }
 const render=()=>{
  panel.replaceChildren();
  const master=document.createElement('label');master.textContent='Site-wide maintenance (preview) ';
  const masterInput=document.createElement('input');masterInput.type='checkbox';masterInput.checked=preview.masterMaintenance;
  masterInput.addEventListener('change',()=>{preview.masterMaintenance=masterInput.checked;render()});
  master.append(masterInput);panel.append(master);
  const list=document.createElement('ul');
  for(const feature of resolvePublicFeatureStatus({...preview,routingConfirmed:false})){
   const row=document.createElement('li');row.dataset.featureId=feature.id;const label=document.createElement('label');
   label.textContent=feature.label+' — ';
   const select=document.createElement('select');select.setAttribute('aria-label',feature.label+' preview status');
   for(const state of ['maintenance','live']){const option=document.createElement('option');option.value=state;option.textContent=state==='live'?'LIVE (preview)':'MAINTENANCE (preview)';select.append(option)}
   select.value=preview.routeStates[feature.id];
   select.addEventListener('change',()=>{preview.routeStates[feature.id]=select.value;note.textContent='Preview updated locally. Live routing remains unchanged.'});
   const status=document.createElement('span');status.dataset.effectiveStatus='true';status.textContent=' Effective live status: UNKNOWN (not connected)';
   label.append(select,status);row.append(label);list.append(row);
  }
  panel.append(list);
 };
 render();
 // Do not fetch until the owner has explicitly opened the Maintenance Center.
 document.getElementById('maintenance-open')?.addEventListener('click',()=>{void readOwnerStatus()});
}
