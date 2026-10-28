// Movie Theater on-demand preview. The legacy 24/7 TV channel is disabled.

// External chat controller: inline scripts are blocked by the protected owner gateway CSP.
if(document.getElementById('theater-chat-toggle')){
(()=>{const toggle=document.getElementById('theater-chat-toggle'),win=document.getElementById('theater-chat-window'),close=document.getElementById('theater-chat-close'),form=document.getElementById('theater-chat-form'),input=document.getElementById('theater-chat-input'),messages=document.getElementById('theater-chat-messages');function setOpen(open){win.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)input.focus()}toggle.addEventListener('click',()=>setOpen(win.hidden));close.addEventListener('click',()=>setOpen(false));form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!value)return;const item=document.createElement('div');item.className='theater-chat-message mine';item.textContent=value;messages.append(item);messages.scrollTop=messages.scrollHeight;input.value='';input.focus()})})();
}

// DVD shelf preview selection (sample cases do not imply playable content).
const dvdShelf=document.getElementById('dvd-shelf');
if(dvdShelf){dvdShelf.addEventListener('click',event=>{const selected=event.target.closest('.dvd-case');if(!selected)return;if(selected.classList.contains('dark-side-dvd'))return;document.getElementById('dvd-selection').textContent=selected.dataset.title+' — choose a local video file to preview on the silver screen. The case is not a saved movie.';const fileInput=document.getElementById('theater-local-file');if(fileInput){fileInput.scrollIntoView({behavior:'smooth',block:'center'});fileInput.focus();}});}

// Local-only preview: browser object URLs are never uploaded or persisted.
const localFile=document.getElementById('theater-local-file');
const localPlayer=document.getElementById('theater-local-player');
const localStatus=document.getElementById('theater-local-status');
const placeholder=document.getElementById('theater-library-placeholder');
if(localFile&&localPlayer&&localStatus&&placeholder){
 let objectUrl=null;
 const release=()=>{localPlayer.pause();localPlayer.removeAttribute('src');localPlayer.load();if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}};
 localFile.addEventListener('change',()=>{
  release();
  const file=localFile.files?.[0];
  if(!file){localPlayer.hidden=true;placeholder.hidden=false;localStatus.textContent='No video selected. Files are not uploaded.';return;}
  if(!file.type.startsWith('video/')){localPlayer.hidden=true;placeholder.hidden=false;localStatus.textContent='Choose a video file supported by your browser.';return;}
  const youtube=document.getElementById('theater-youtube-player');if(youtube){youtube.hidden=true;youtube.removeAttribute('src');}
  objectUrl=URL.createObjectURL(file);
  localPlayer.src=objectUrl;localPlayer.hidden=false;placeholder.hidden=true;
  localStatus.textContent='Local preview: '+file.name+'. This file is not uploaded or saved to the movie library.';
  localPlayer.load();
 });
 localPlayer.addEventListener('error',()=>{localStatus.textContent='This video format could not be played in your browser. Try MP4 (H.264) or WebM.';});
 window.addEventListener('pagehide',release,{once:true});
}

// YouTube preview uses only the official iframe player; no downloading or ad bypass.
function youtubeVideoId(raw){
 try{
  const url=new URL(raw);
  if(url.protocol!=='https:')return null;
  const host=url.hostname.toLowerCase();
  let id=null;
  if(host==='youtu.be')id=url.pathname.split('/')[1];
  else if(host==='youtube.com'||host==='www.youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com'||host==='www.youtube-nocookie.com'){
   const parts=url.pathname.split('/').filter(Boolean);
   if(parts[0]==='watch')id=url.searchParams.get('v');
   else if(['shorts','embed','live'].includes(parts[0]))id=parts[1];
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(id||'')?id:null;
 }catch{return null;}
}
const youtubeForm=document.getElementById('theater-youtube-form');
if(youtubeForm){youtubeForm.addEventListener('submit',event=>{
 event.preventDefault();
 const input=document.getElementById('theater-youtube-url');
 const status=document.getElementById('theater-youtube-status');
 const iframe=document.getElementById('theater-youtube-player');
 const id=youtubeVideoId(input.value.trim());
 if(!id){status.textContent='Enter a valid YouTube video, Shorts, or youtu.be URL.';return;}
 if(localPlayer){localPlayer.pause();localPlayer.hidden=true;}
 if(placeholder)placeholder.hidden=true;
 iframe.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0';
 iframe.hidden=false;
 status.textContent='YouTube preview loaded. Some videos do not permit embedding; playback and ads are controlled by YouTube.';
 iframe.scrollIntoView({behavior:'smooth',block:'center'});
});}


// Import a DVD created on the owner dashboard, even if the gateway uses a separate origin.
// URL parameters contain only the title and public YouTube video ID, never credentials.
try{
 const params=new URL(location.href).searchParams;
 const id=params.get('dvd_id'),title=params.get('dvd_title');
 if(id&&title&&/^[A-Za-z0-9_-]{11}$/.test(id)&&title.trim().length<=80){
  const key='cartoon-universe-theater-youtube-drafts-v1';
  const existing=JSON.parse(localStorage.getItem(key)||'[]');
  const drafts=Array.isArray(existing)?existing:[];
  if(!drafts.some(x=>x.id===id)&&drafts.length<30){drafts.push({id,title:title.trim()});localStorage.setItem(key,JSON.stringify(drafts));}
  const note=document.getElementById('dvd-selection');if(note)note.textContent='DVD case transferred to this theater browser. Choose the YouTube DVD case below to play it.';
  const clean=new URL(location.href);clean.searchParams.delete('dvd_id');clean.searchParams.delete('dvd_title');history.replaceState(null,'',clean.href);
 }
}catch{/* Storage unavailable: the existing preview still works. */}

// Direct save in the theater avoids owner-dashboard cross-origin and login handoff problems.
const saveDvd=document.getElementById('theater-save-dvd');
if(saveDvd){saveDvd.addEventListener('click',()=>{
 const id=youtubeVideoId(document.getElementById('theater-youtube-url').value.trim());
 const title=document.getElementById('theater-dvd-title').value.trim();
 const status=document.getElementById('theater-youtube-status');
 if(!id||!title){status.textContent='Enter a YouTube URL and DVD case title before saving.';return;}
 try{
  const key='cartoon-universe-theater-youtube-drafts-v1';
  const stored=JSON.parse(localStorage.getItem(key)||'[]');
  const drafts=Array.isArray(stored)?stored:[];
  if(drafts.some(x=>x.id===id)){status.textContent='This YouTube video already has a saved DVD case in this browser.';return;}
  if(drafts.length>=30){status.textContent='Maximum of 30 DVD drafts reached.';return;}
  drafts.push({id,title:title.slice(0,80)});localStorage.setItem(key,JSON.stringify(drafts));
  status.textContent='DVD case saved in this browser. Reload the theater to see it on the DVD shelf.';
  const button=document.createElement('button');button.type='button';button.className='dvd-case';button.style.setProperty('--dvd-a','#7133b8');button.style.setProperty('--dvd-b','#d24b86');
  const art=document.createElement('span');art.className='dvd-art';art.textContent='▶️';const label=document.createElement('strong');label.textContent=title;const note=document.createElement('small');note.textContent='YouTube • Saved in this browser';button.append(art,label,note);
  button.addEventListener('click',()=>{document.getElementById('theater-youtube-url').value='https://www.youtube.com/watch?v='+id;youtubeForm.requestSubmit();});
  dvdShelf.append(button);
 }catch{status.textContent='Could not save this DVD. Check whether browser storage is enabled.';}
});}

// Show same-browser owner drafts as playable DVD cases; no shared publication.
try{
 const drafts=JSON.parse(localStorage.getItem('cartoon-universe-theater-youtube-drafts-v1')||'[]');
 if(Array.isArray(drafts)&&dvdShelf){
  for(const dvd of drafts.slice(0,30)){
   if(typeof dvd.title!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(dvd.id))continue;
   const button=document.createElement('button');button.type='button';button.className='dvd-case';button.style.setProperty('--dvd-a','#7133b8');button.style.setProperty('--dvd-b','#d24b86');
   const art=document.createElement('span');art.className='dvd-art';art.textContent='▶️';
   const title=document.createElement('strong');title.textContent=dvd.title;
   const note=document.createElement('small');note.textContent='YouTube • Browser draft';
   button.append(art,title,note);
   button.addEventListener('click',()=>{
    const input=document.getElementById('theater-youtube-url');const form=document.getElementById('theater-youtube-form');
    if(input&&form){input.value='https://www.youtube.com/watch?v='+dvd.id;form.requestSubmit();}
   });dvdShelf.append(button);
  }
 }
}catch{/* Browser storage may be disabled. */}

// Dark Side of the Ring: episodes grouped and sorted by season and episode number.
const darkCase=document.querySelector('.dark-side-dvd');
const darkPanel=document.getElementById('dark-side-episodes');
const darkForm=document.getElementById('dark-side-episode-form');
const darkKey='cartoon-universe-dark-side-episodes-v1';
function darkRead(){try{const x=JSON.parse(localStorage.getItem(darkKey)||'[]');return Array.isArray(x)?x.filter(e=>typeof e.title==='string'&&/^[A-Za-z0-9_-]{11}$/.test(e.id)).slice(0,50).map((e,i)=>({...e,season:Number.isInteger(Number(e.season))&&Number(e.season)>=1&&Number(e.season)<=99?Number(e.season):1,number:Number.isInteger(Number(e.number))&&Number(e.number)>=1&&Number(e.number)<=999?Number(e.number):i+1})):[];}catch{return [];}}
function darkRender(){const list=document.getElementById('dark-side-episode-list');list.replaceChildren();const episodes=darkRead().sort((a,b)=>a.season-b.season||a.number-b.number);document.getElementById('dark-side-episode-status').textContent=episodes.length?episodes.length+' episode(s) across '+new Set(episodes.map(e=>e.season)).size+' season(s), saved in this browser.':'No episodes added yet.';let currentSeason=null;for(const episode of episodes){if(episode.season!==currentSeason){currentSeason=episode.season;const heading=document.createElement('h4');heading.className='dark-side-season';heading.textContent='Season '+currentSeason;list.append(heading);}const row=document.createElement('div');row.className='dark-side-episode-row';const play=document.createElement('button');play.type='button';play.textContent='▶ Episode '+episode.number+': '+episode.title;play.addEventListener('click',()=>{document.getElementById('theater-youtube-url').value='https://www.youtube.com/watch?v='+episode.id;youtubeForm.requestSubmit();});const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.addEventListener('click',()=>{const next=darkRead().filter(e=>!(e.id===episode.id));localStorage.setItem(darkKey,JSON.stringify(next));darkRender();});row.append(play,remove);list.append(row);}}
if(darkCase&&darkPanel&&darkForm){darkCase.addEventListener('click',()=>{darkPanel.hidden=!darkPanel.hidden;darkCase.setAttribute('aria-expanded',String(!darkPanel.hidden));if(!darkPanel.hidden){darkRender();darkPanel.scrollIntoView({behavior:'smooth',block:'nearest'});}});darkForm.addEventListener('submit',event=>{event.preventDefault();const title=document.getElementById('dark-side-episode-title').value.trim();const id=youtubeVideoId(document.getElementById('dark-side-episode-url').value.trim());const season=Number(document.getElementById('dark-side-episode-season').value);const number=Number(document.getElementById('dark-side-episode-number').value);const status=document.getElementById('dark-side-episode-status');if(!title||!id||!Number.isInteger(season)||season<1||season>99||!Number.isInteger(number)||number<1||number>999){status.textContent='Enter a season, episode number, title and valid YouTube URL.';return;}try{const episodes=darkRead();if(episodes.length>=50){status.textContent='Maximum of 50 episodes reached.';return;}if(episodes.some(e=>e.id===id)){status.textContent='That video is already saved.';return;}if(episodes.some(e=>e.season===season&&e.number===number)){status.textContent='That season and episode number is already used.';return;}episodes.push({title:title.slice(0,100),id,season,number});localStorage.setItem(darkKey,JSON.stringify(episodes));darkForm.reset();document.getElementById('dark-side-episode-season').value=season;document.getElementById('dark-side-episode-number').value=number+1;darkRender();}catch{status.textContent='Browser storage unavailable. Episode not saved.';}});}
