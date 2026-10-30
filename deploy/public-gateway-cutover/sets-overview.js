// Verified official-series wordmarks from Wikimedia Commons; other series keep local artwork/text fallbacks.
const verifiedSeriesLogos={'Adventure Time':'https://commons.wikimedia.org/wiki/Special:FilePath/Adventure_Time_logo2.png','Dragon Ball Z':'https://commons.wikimedia.org/wiki/Special:FilePath/Dragon_Ball_Z_logo.svg','Naruto':'https://commons.wikimedia.org/wiki/Special:FilePath/Naruto_logo.svg','The Simpsons':'https://commons.wikimedia.org/wiki/Special:FilePath/The_Simpsons_Logo.svg','American Dad':'https://commons.wikimedia.org/wiki/Special:FilePath/American_dad_logo.svg','Yu Yu Hakusho':'https://commons.wikimedia.org/wiki/Special:FilePath/Y%C5%AB_Y%C5%AB_Hakusho_logo.svg','Futurama':'https://commons.wikimedia.org/wiki/Special:FilePath/Futurama_1999_logo.svg','SpongeBob SquarePants':'https://commons.wikimedia.org/wiki/Special:FilePath/SpongeBob_SquarePants_logo.png'};
// Cartoon Universe 3.0 public Ctoon series catalog. Text fallbacks are intentional.
const catalog={
'Cartoons':['Adventure Time','American Dad','Ben 10','Camp Lazlo','Class of 3000',"Codename: Kids Next Door",'Family Guy','Futurama','Jackie Chan Adventures','Mucha Lucha','South Park','SpongeBob SquarePants','Teen Titans','The Simpsons','Tom & Jerry','Xiaolin Showdown'],
'Anime':['Attack on Titan','Case Closed','Digimon','Dragon Ball Z','Duel Masters','Fullmetal Alchemist','Hamtaro','Inuyasha','Lupin the Third','Naruto','One Piece','Pokémon','The Seven Deadly Sins','Yu-Gi-Oh!','Yu-Gi-Oh! GX','Yu Yu Hakusho','Zatch Bell'],
'Disney':['Big Hero 6',"The Emperor's New Groove",'Hercules','Kim Possible','Phineas and Ferb','Pirates of the Caribbean','The Nightmare Before Christmas'],
'Video Games':['Kingdom Hearts','Super Mario','The Legend of Zelda'],
'Misc.':['Misc.']
};
const container=document.getElementById('sets-grid');
const search=document.getElementById('series-search');
const filter=document.getElementById('series-filter');
const count=document.getElementById('series-count');
const slug=name=>name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function render(){
 const query=search.value.trim().toLocaleLowerCase();const selected=filter.value;container.replaceChildren();let total=0;
 for(const category of ['Anime','Cartoons','Disney','Video Games','Misc.']){
  if(selected!=='All'&&selected!==category)continue;
  const names=catalog[category].filter(n=>n.toLocaleLowerCase().includes(query)).sort((a,b)=>a.localeCompare(b));if(!names.length)continue;
  const heading=document.createElement('h2');heading.className='group-heading';heading.textContent=category;container.append(heading);
  const grid=document.createElement('div');grid.className='grid';
  for(const name of names){
   total++;const card=document.createElement('article');card.className='set-card';
   const fallback=document.createElement('div');fallback.className='set-wordmark';fallback.textContent=name;
   const img=document.createElement('img');img.className='set-logo';img.alt=name+' logo';img.hidden=true;img.loading='lazy';img.src=verifiedSeriesLogos[name]||('static/series-logos/'+slug(name)+'.png');
   img.addEventListener('load',()=>{img.hidden=false;fallback.hidden=true});
   img.addEventListener('error',()=>{img.remove();fallback.hidden=false});
   const title=document.createElement('h2');title.textContent=name;const label=document.createElement('small');label.textContent=category;
   card.append(img,fallback,title,label);grid.append(card);
  }
  container.append(grid);
 }
 count.textContent=total+' series shown'+(selected==='Video Games'?' (featured; browse full 90-series catalog below)':'');
 if(!total){const empty=document.createElement('p');empty.className='empty';empty.textContent='No matching series found.';container.append(empty)}
}
search.addEventListener('input',render);filter.addEventListener('change',render);render();

// Load the full existing console/handheld draft catalog instead of showing only featured games.
fetch('data/console-cartoon-anime-game-sets.draft.json',{cache:'no-store'})
 .then(response=>{if(!response.ok)throw Error('Catalog unavailable');return response.json()})
 .then(data=>{
  if(!Array.isArray(data.sets))return;
  const games=data.sets.map(entry=>entry.series).filter(name=>typeof name==='string'&&name.trim());
  catalog['Video Games']=[...new Set([...games,...catalog['Video Games']])];
  render();
 })
 .catch(()=>{const note=document.createElement('p');note.className='notice';note.textContent='Full Video Games preview catalog is temporarily unavailable; featured sets remain visible.';container.after(note)});
