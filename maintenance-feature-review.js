// Owner dashboard review-only UI: no network calls or maintenance writes.
import {PUBLIC_FEATURES,resolvePublicFeatureStatus} from './deploy/feature-status-preview/public-feature-status.mjs';
const panel=document.getElementById('maintenance-feature-list');
const note=document.getElementById('maintenance-feature-note');
if(panel&&note){
 const preview={masterMaintenance:true,routeStates:Object.fromEntries(PUBLIC_FEATURES.map(f=>[f.id,'maintenance']))};
 const render=()=>{
  panel.replaceChildren();
  const master=document.createElement('label');master.textContent='Site-wide maintenance (preview) ';
  const masterInput=document.createElement('input');masterInput.type='checkbox';masterInput.checked=preview.masterMaintenance;
  masterInput.addEventListener('change',()=>{preview.masterMaintenance=masterInput.checked;render()});
  master.append(masterInput);panel.append(master);
  const list=document.createElement('ul');
  for(const feature of resolvePublicFeatureStatus({...preview,routingConfirmed:false})){
   const row=document.createElement('li');const label=document.createElement('label');
   label.textContent=feature.label+' — ';
   const select=document.createElement('select');select.setAttribute('aria-label',feature.label+' preview status');
   for(const state of ['maintenance','live']){const option=document.createElement('option');option.value=state;option.textContent=state==='live'?'LIVE (preview)':'MAINTENANCE (preview)';select.append(option)}
   select.value=preview.routeStates[feature.id];
   select.addEventListener('change',()=>{preview.routeStates[feature.id]=select.value;note.textContent='Preview updated locally. Live routing remains unchanged.'});
   const status=document.createElement('span');status.textContent=' Effective live status: UNKNOWN (not connected)';
   label.append(select,status);row.append(label);list.append(row);
  }
  panel.append(list);
 };
 render();
}
