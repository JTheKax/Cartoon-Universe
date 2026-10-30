(() => {
 const grid=document.getElementById('collect-sticker-grid');
 const count=document.getElementById('registry-count');
 const seriesCount=document.getElementById('series-count');
 const published=document.getElementById('library-published-count');
 fetch('sticker-catalog.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Catalog unavailable');return response.json()}).then(data=>{
  const series=Array.isArray(data.series)?data.series:[];
  const ctoons=Array.isArray(data.stickers)?data.stickers:[];
  seriesCount.textContent=String(series.length);
  published.textContent=String(ctoons.filter(item=>item.published===true).length);
  count.textContent=ctoons.length+' Ctoons recorded';
  if(series.length){const shelf=document.getElementById('series-empty');shelf.className='library-cards';shelf.replaceChildren();for(const item of series){const card=document.createElement('article');card.className='library-card';const art=document.createElement('div');art.className='library-card-art';const themes={
  'cartoons':{symbol:'✦',color:'#ffb32c',background:'linear-gradient(135deg,#6c278f,#d34878)'},
  'anime':{symbol:'⛩',color:'#ffcad9',background:'linear-gradient(135deg,#5d204c,#c13b66)'},
  'movies':{symbol:'▶',color:'#ffe7a0',background:'linear-gradient(135deg,#171c39,#8d6225)'},
  'video-games':{symbol:'◆',color:'#81ffdf',background:'linear-gradient(135deg,#0d3855,#167c80)'},
  'misc':{symbol:'★',color:'#d9ccff',background:'linear-gradient(135deg,#35335d,#6756a1)'}
 };const theme=themes[item.id]||themes.misc;art.replaceChildren();const logo=document.createElement('div');logo.setAttribute('role','img');logo.setAttribute('aria-label',item.name+' Ctoon set logo');logo.style.cssText='width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:6px;border-radius:10px;padding:12px;box-sizing:border-box;background:'+theme.background+';text-shadow:0 3px 0 #0008';const emblem=document.createElement('span');emblem.textContent=theme.symbol;emblem.style.cssText='font-size:2.6rem;line-height:1;color:'+theme.color;const wordmark=document.createElement('strong');wordmark.textContent=item.name.toUpperCase();wordmark.style.cssText='font-size:clamp(1.15rem,3vw,1.7rem);letter-spacing:.08em;line-height:1.1;text-align:center;color:#fff';logo.append(emblem,wordmark);art.append(logo);const info=document.createElement('div');info.className='library-card-info';const title=document.createElement('h3');title.textContent=item.name;const status=document.createElement('p');status.textContent='Coming Soon · '+ctoons.filter(c=>c.series===item.name).length+' Ctoons';info.append(title,status);card.append(art,info);shelf.append(card)}}
  if(ctoons.length){grid.replaceChildren();for(const item of ctoons){const p=document.createElement('p');p.textContent=item.name;grid.append(p)}}
 }).catch(()=>{count.textContent='Ctoon catalog unavailable';});
})();
