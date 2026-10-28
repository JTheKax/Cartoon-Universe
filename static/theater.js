// Movie Theater on-demand preview. The legacy 24/7 TV channel is disabled.\n\n// External chat controller: inline scripts are blocked by the protected owner gateway CSP.
if(document.getElementById('theater-chat-toggle')){
(()=>{const toggle=document.getElementById('theater-chat-toggle'),win=document.getElementById('theater-chat-window'),close=document.getElementById('theater-chat-close'),form=document.getElementById('theater-chat-form'),input=document.getElementById('theater-chat-input'),messages=document.getElementById('theater-chat-messages');function setOpen(open){win.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)input.focus()}toggle.addEventListener('click',()=>setOpen(win.hidden));close.addEventListener('click',()=>setOpen(false));form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!value)return;const item=document.createElement('div');item.className='theater-chat-message mine';item.textContent=value;messages.append(item);messages.scrollTop=messages.scrollHeight;input.value='';input.focus()})})();
}

// DVD shelf preview selection (sample cases do not imply playable content).
const dvdShelf=document.getElementById('dvd-shelf');
if(dvdShelf){dvdShelf.addEventListener('click',event=>{const selected=event.target.closest('.dvd-case');if(!selected)return;document.getElementById('dvd-selection').textContent=selected.dataset.title+' — demo DVD case. Upload and playback integration is coming next.';});}
