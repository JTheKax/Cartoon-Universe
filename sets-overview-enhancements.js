(() => {
const shelf=document.querySelector('#series-shelf .library-cards');
const filter=document.getElementById('collect-series');
if(!shelf||!filter)return;
const added=['American Dad','Naruto','One Piece'];
const names=[...added,'Video Games'];
const disney=['Big Hero 6',"The Emperor's New Groove",'Hercules','Kim Possible','The Nightmare Before Christmas','Phineas and Ferb','Pirates of the Caribbean'];
const misc=document.getElementById('misc-series-link');
if(misc){misc.setAttribute('aria-label','Browse Video Games stickers');misc.querySelector('h3').textContent='Video Games';const graphic=misc.querySelector('.library-card-art strong');if(graphic)graphic.textContent='VIDEO GAMES';}
for(const opt of filter.options){if(opt.value==='Misc.'){opt.value='Video Games';opt.textContent='Video Games';}}
for(const name of added){
 const card=document.createElement('a');card.className='library-card';card.href='#sticker-library';card.setAttribute('aria-label','Browse '+name+' stickers');
 const art=document.createElement('div');art.className='library-card-art';art.style.cssText='display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#1d3b65,#142044);padding:15px';
 const word=document.createElement('strong');word.textContent=name;word.style.cssText='font-size:clamp(1.4rem,3vw,2rem);color:white;text-align:center;text-shadow:0 2px #000';art.append(word);
 const info=document.createElement('div');info.className='library-card-info';const heading=document.createElement('h3');heading.textContent=name;const p=document.createElement('p');p.textContent='0 stickers cataloged';info.append(heading,p);card.append(art,info);shelf.append(card);
 const opt=document.createElement('option');opt.value=name;opt.textContent=name;filter.append(opt);
 card.addEventListener('click',()=>{filter.value=name;filter.dispatchEvent(new Event('input',{bubbles:true}));});
}
const disneyCard=document.getElementById('disney-series-link');
if(disneyCard){
 const block=document.createElement('div');block.className='disney-subseries';block.style.cssText='padding:10px 14px;border-top:1px solid #6f9cc0';
 const heading=document.createElement('strong');heading.textContent='Subseries';block.append(heading);
 const list=document.createElement('ul');list.style.cssText='padding-left:20px;margin:8px 0';for(const name of disney){const li=document.createElement('li');li.textContent=name;list.append(li);}block.append(list);disneyCard.append(block);
}
const cards=[...shelf.children];cards.sort((a,b)=>a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent));shelf.replaceChildren(...cards);
})();