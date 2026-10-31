// Cartoon Universe 3.0 public Ctoon series catalog. Text fallbacks are intentional.
const catalog={
  "Cartoons": [
    "Dexter’s Laboratory",
    "Ed, Edd n Eddy",
    "Johnny Bravo",
    "Foster’s Home for Imaginary Friends",
    "The Powerpuff Girls",
    "Samurai Jack",
    "Xiaolin Showdown",
    "Camp Lazlo",
    "SpongeBob SquarePants",
    "The Fairly OddParents",
    "Jimmy Neutron",
    "Danny Phantom",
    "Class of 3000",
    "Courage the Cowardly Dog",
    "Codename: Kids Next Door",
    "Family Guy",
    "South Park",
    "Adventure Time",
    "The Simpsons",
    "¡Mucha Lucha!",
    "Ben 10",
    "Tom and Jerry",
    "Jackie Chan Adventures",
    "Teen Titans"
  ],
  "Anime": [
    "Dragon Ball Z",
    "Naruto",
    "One Piece",
    "Attack on Titan",
    "The Seven Deadly Sins",
    "Digimon",
    "Pokémon",
    "Inuyasha",
    "Yu-Gi-Oh!",
    "Yu Yu Hakusho",
    "Zatch Bell!",
    "Duel Masters",
    "Hamtaro",
    "Lupin the Third",
    "Fullmetal Alchemist",
    "Case Closed",
    "Yu-Gi-Oh! GX"
  ],
  "Movies": [],
  "Video Games": [
    "Kingdom Hearts",
    "Super Mario",
    "The Legend of Zelda"
  ],
  "Misc": []
};
const container=document.getElementById('sets-grid');
const search=document.getElementById('series-search');
const filter=document.getElementById('series-filter');
const count=document.getElementById('series-count');
const slug=name=>name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function render(){
 const query=search.value.trim().toLocaleLowerCase();const selected=filter.value;container.replaceChildren();let total=0;
 for(const category of ['Cartoons','Anime','Movies','Video Games','Misc']){
  if(selected!=='All'&&selected!==category)continue;
  const names=catalog[category].filter(n=>n.toLocaleLowerCase().includes(query)).sort((a,b)=>a.localeCompare(b));if(!names.length&&query)continue;
  const heading=document.createElement('h2');heading.className='group-heading';heading.textContent=category;container.append(heading);
  const grid=document.createElement('div');grid.className='grid';
  for(const name of names){
   total++;const card=document.createElement('article');card.className='set-card';
   const fallback=document.createElement('div');fallback.className='set-wordmark';fallback.textContent=name;
   const img=document.createElement('img');img.className='set-logo';img.alt=name+' logo';img.hidden=true;img.loading='lazy';img.src='static/series-logos/'+slug(name)+'.png';
   img.addEventListener('load',()=>{img.hidden=false;fallback.hidden=true});
   img.addEventListener('error',()=>{img.remove();fallback.hidden=false});
   const title=document.createElement('h2');title.textContent=name;const label=document.createElement('small');label.textContent=category;
   card.append(img,fallback,title,label);grid.append(card);
  }
  if(!names.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No series added yet.';grid.append(empty);}container.append(grid);
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
