const menu=document.getElementById('menu');
const nav=document.getElementById('nav');
if(menu&&nav){
 function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰'}
 menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰'});
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
 // HOME must return to the actual top of the page, including when already on #home.
 const homeLink=nav.querySelector('a[href="#home"]');
 if(homeLink)homeLink.addEventListener('click',event=>{
  event.preventDefault();closeMenu();
  if(location.hash!=='#home')history.pushState(null,'','#home');
  window.scrollTo({top:0,behavior:'auto'});
  highlight();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus()}});
 document.addEventListener('click',e=>{if(!nav.contains(e.target)&&!menu.contains(e.target))closeMenu()});
 const highlight=()=>{const hash=location.hash||'#home';nav.querySelectorAll('a[href^="#"]').forEach(a=>{const active=a.getAttribute('href')===hash;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})};
 window.addEventListener('hashchange',highlight);highlight();
}
