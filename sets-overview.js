// Local artwork takes precedence; the styled wordmark remains visible if an image is missing.
const series = ['American Dad','Disney','Dragon Ball Z','Family Guy','Futurama','Naruto','One Piece','SpongeBob SquarePants','The Simpsons','Video Games','Xiaolin Showdown'];
const subseries = { Disney: ['Big Hero 6', "The Emperor's New Groove", 'Hercules', 'Kim Possible', 'Phineas and Ferb', 'Pirates of the Caribbean', 'The Nightmare Before Christmas'] };
const grid = document.getElementById('sets-grid');
for (const name of series) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const card = document.createElement('article'); card.className='set-card';
  const fallback = document.createElement('div'); fallback.className='set-wordmark'; fallback.textContent=name;
  const image = document.createElement('img'); image.className='set-logo'; image.alt=name+' series logo'; image.src='static/series-logos/'+slug+'.png'; image.hidden=true;
  image.addEventListener('load',()=>{image.hidden=false;fallback.hidden=true});
  image.addEventListener('error',()=>{image.remove();fallback.hidden=false});
  const title=document.createElement('h2'); title.textContent=name;
  card.append(image,fallback,title);
  if (subseries[name]) {
    const group = document.createElement('div');
    group.className = 'set-subseries';
    const heading = document.createElement('h3'); heading.textContent = 'Subseries';
    const list = document.createElement('ul');
    for (const child of subseries[name]) {
      const item = document.createElement('li'); item.textContent = child; list.append(item);
    }
    group.append(heading,list); card.append(group);
  }
  grid.append(card);
}