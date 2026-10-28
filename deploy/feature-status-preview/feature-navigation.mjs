import {resolvePublicFeatureStatus} from './public-feature-status.mjs';
// Shared status resolver keeps navigation badges consistent with the public status page.
export function createFeatureNavigation(document,options={}){
 const nav=document.createElement('nav');
 nav.setAttribute('aria-label','Cartoon Universe features');
 for(const item of resolvePublicFeatureStatus(options)){
  const link=document.createElement('a');link.href=item.path;link.textContent=item.label+' ';
  const badge=document.createElement('span');badge.className='feature-badge '+item.status.toLowerCase();
  badge.textContent=item.status;badge.setAttribute('aria-label',item.label+': '+item.status);
  link.append(badge);nav.append(link);
 }
 return nav;
}
