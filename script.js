const menu=document.getElementById('menu');
const nav=document.getElementById('nav');
if(menu&&nav){
 const groups=[...nav.querySelectorAll('.nav-group')];
 function closeDropdowns(except=null){for(const group of groups){if(group===except)continue;group.querySelector('.nav-dropdown').classList.remove('open');group.querySelector('.nav-trigger').setAttribute('aria-expanded','false')}}
 function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';closeDropdowns()}
 menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'✕':'☰';if(!open)closeDropdowns()});
 for(const group of groups){const trigger=group.querySelector('.nav-trigger'),dropdown=group.querySelector('.nav-dropdown');trigger.addEventListener('click',()=>{const open=!dropdown.classList.contains('open');closeDropdowns(group);dropdown.classList.toggle('open',open);trigger.setAttribute('aria-expanded',String(open))})}
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();menu.focus()}});
 document.addEventListener('click',e=>{if(!nav.contains(e.target)&&!menu.contains(e.target))closeMenu()});
 const highlight=()=>{const hash=location.hash||'#home';nav.querySelectorAll('a[href^="#"]').forEach(a=>{const active=a.getAttribute('href')===hash;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')})};window.addEventListener('hashchange',highlight);highlight();
}
