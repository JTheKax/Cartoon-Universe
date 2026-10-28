// Movie Theater on-demand preview. The legacy 24/7 TV channel is disabled.

// External chat controller: inline scripts are blocked by the protected owner gateway CSP.
if(document.getElementById('theater-chat-toggle')){
(()=>{const toggle=document.getElementById('theater-chat-toggle'),win=document.getElementById('theater-chat-window'),close=document.getElementById('theater-chat-close'),form=document.getElementById('theater-chat-form'),input=document.getElementById('theater-chat-input'),messages=document.getElementById('theater-chat-messages');function setOpen(open){win.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)input.focus()}toggle.addEventListener('click',()=>setOpen(win.hidden));close.addEventListener('click',()=>setOpen(false));form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!value)return;const item=document.createElement('div');item.className='theater-chat-message mine';item.textContent=value;messages.append(item);messages.scrollTop=messages.scrollHeight;input.value='';input.focus()})})();
}

// DVD shelf preview selection (sample cases do not imply playable content).
const dvdShelf=document.getElementById('dvd-shelf');
if(dvdShelf){dvdShelf.addEventListener('click',event=>{const selected=event.target.closest('.dvd-case');if(!selected)return;document.getElementById('dvd-selection').textContent=selected.dataset.title+' — demo DVD case. Upload and playback integration is coming next.';});}

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
  objectUrl=URL.createObjectURL(file);
  localPlayer.src=objectUrl;localPlayer.hidden=false;placeholder.hidden=true;
  localStatus.textContent='Local preview: '+file.name+'. This file is not uploaded or saved to the movie library.';
  localPlayer.load();
 });
 localPlayer.addEventListener('error',()=>{localStatus.textContent='This video format could not be played in your browser. Try MP4 (H.264) or WebM.';});
 window.addEventListener('pagehide',release,{once:true});
}
