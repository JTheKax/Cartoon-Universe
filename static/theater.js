// Movie Theater on-demand preview. The legacy 24/7 TV channel is disabled.

// External chat controller: inline scripts are blocked by the protected owner gateway CSP.
if(document.getElementById('theater-chat-toggle')){
(()=>{const toggle=document.getElementById('theater-chat-toggle'),win=document.getElementById('theater-chat-window'),close=document.getElementById('theater-chat-close'),form=document.getElementById('theater-chat-form'),input=document.getElementById('theater-chat-input'),messages=document.getElementById('theater-chat-messages');function setOpen(open){win.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)input.focus()}toggle.addEventListener('click',()=>setOpen(win.hidden));close.addEventListener('click',()=>setOpen(false));form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!value)return;const item=document.createElement('div');item.className='theater-chat-message mine';item.textContent=value;messages.append(item);messages.scrollTop=messages.scrollHeight;input.value='';input.focus()})})();
}

// DVD shelf preview selection (sample cases do not imply playable content).
const dvdShelf=document.getElementById('dvd-shelf');
if(dvdShelf){dvdShelf.addEventListener('click',event=>{const selected=event.target.closest('.dvd-case');if(!selected)return;document.getElementById('dvd-selection').textContent=selected.dataset.title+' — choose a local video file to preview on the silver screen. The case is not a saved movie.';const fileInput=document.getElementById('theater-local-file');if(fileInput){fileInput.scrollIntoView({behavior:'smooth',block:'center'});fileInput.focus();}});}

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
