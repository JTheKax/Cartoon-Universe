// Series Overview catalog: keep all published categories visible while artwork is pending.
const series = ['American Dad','Disney','Dragon Ball Z','Family Guy','Futurama','Naruto','One Piece','SpongeBob SquarePants','The Simpsons','Video Games','Xiaolin Showdown','Cartoons','Anime','Misc.'];
const subseries = {
  Disney: ['Big Hero 6',"The Emperor's New Groove",'Hercules','Kim Possible','Phineas and Ferb','Pirates of the Caribbean','The Nightmare Before Christmas'],
  Cartoons: ['Adventure Time','Ben 10','Camp Lazlo','Class of 3000',"Codename: Kids Next Door",'Jackie Chan Adventures','Mucha Lucha','South Park','Teen Titans','Tom & Jerry'],
  Anime: ['Attack on Titan','Case Closed','Digimon','Dragon Ball Z','Duel Masters','Fullmetal Alchemist','Hamtaro','Inuyasha','Lupin the Third','Naruto','One Piece','Pokémon','The Seven Deadly Sins','Yu-Gi-Oh!','Yu-Gi-Oh! GX','Yu Yu Hakusho','Zatch Bell']
};
const grid = document.getElementById('sets-grid');
const ordered = [...new Set(series)].sort((a,b)=>a==='Misc.'?1:b==='Misc.'?-1:a.localeCompare(b));
for (const name of ordered) {
  const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const card=document.createElement('article'); card.className='set-card';
  const fallback=document.createElement('div'); fallback.className='set-wordmark'; fallback.textContent=name;
  const img=document.createElement('img'); img.className='set-logo'; img.alt=name+' logo'; img.src='static/series-logos/'+slug+'.png'; img.hidden=true;
  img.addEventListener('load',()=>{img.hidden=false;fallback.hidden=true});
  img.addEventListener('error',()=>{img.remove();fallback.hidden=false});
  const title=document.createElement('h2');title.textContent=name;card.append(img,fallback,title);
  if(subseries[name]){
    const group=document.createElement('div');group.className='set-subseries';
    const heading=document.createElement('h3');heading.textContent='Subseries';
    const list=document.createElement('ul');
    for(const child of subseries[name]){
      const li=document.createElement('li');const link=document.createElement('a');link.textContent=child;link.href='set-detail.html?series='+encodeURIComponent(name)+'&subseries='+encodeURIComponent(child);link.style.color='#bdefff';li.append(link);list.append(li);
    }
    group.append(heading,list);card.append(group);
  }
  if(name==='Video Games'){
    const link=document.createElement('a');link.href='console-game-sets-preview.html';link.textContent='Browse Video Game Sets';link.style.color='#7dd3fc';card.append(link);
  }
  if(name!=='Video Games') { const browse=document.createElement('a');browse.href='set-detail.html?series='+encodeURIComponent(name);browse.textContent='Browse '+name+' stickers';browse.style.color='#7dd3fc';card.append(browse); }
  grid.append(card);
}
