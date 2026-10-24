const menu=document.getElementById('menu');
const nav=document.getElementById('nav');
if(menu&&nav){
 const close=()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰'};
 menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰'});
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 document.addEventListener('click',e=>{if(!nav.contains(e.target)&&!menu.contains(e.target))close()});
 const highlight=()=>{const hash=location.hash||'#home';nav.querySelectorAll('a[href^="#"]').forEach(a=>{const active=a.getAttribute('href')===hash;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})};
 window.addEventListener('hashchange',highlight);highlight();
}
