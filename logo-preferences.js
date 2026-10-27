// Logo selection is a browser-local preview, not a global publishing control.
(() => {
 const key='cartoon-universe-logo-mode';
 const allowed=new Set(['alternate','dragon','ninja']);
 const labels={alternate:'Alternating (Dragon Energy / Ninja Chakra)',dragon:'Dragon Energy',ninja:'Ninja Chakra'};
 const read=()=>{try{return localStorage.getItem(key)||'alternate'}catch{return 'alternate'}};
 function apply(mode){
  const selected=allowed.has(mode)?mode:'alternate';
  document.documentElement.dataset.logoMode=selected;
  document.querySelectorAll('[data-owner-logo]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ownerLogo===selected)));
  const status=document.getElementById('owner-logo-status');
  if(status)status.textContent='Selected logo: '+labels[selected]+' · Browser preview only';
 }
 document.addEventListener('DOMContentLoaded',()=>{
  apply(read());
  document.querySelectorAll('[data-owner-logo]').forEach(button=>button.addEventListener('click',()=>{
   const mode=button.dataset.ownerLogo;if(!allowed.has(mode))return;
   try{localStorage.setItem(key,mode)}catch{}
   apply(mode);
  }));
 });
 apply(read());
})();
