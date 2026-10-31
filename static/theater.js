// Movie Theater on-demand preview. The legacy 24/7 TV channel is disabled.

// Shared theater chat: persisted in Supabase, synchronized with Realtime.
if(document.getElementById('theater-chat-toggle')){
(async()=>{
 const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
 const {SUPABASE_URL,SUPABASE_ANON_KEY}=await import('../config.js');
 const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 const toggle=document.getElementById('theater-chat-toggle'),win=document.getElementById('theater-chat-window'),close=document.getElementById('theater-chat-close'),form=document.getElementById('theater-chat-form'),input=document.getElementById('theater-chat-input'),messages=document.getElementById('theater-chat-messages');
 messages.replaceChildren();
 const status=document.createElement('p');status.setAttribute('role','status');status.className='theater-chat-status';form.before(status);
 let user=null,owner=false,profileName='Player',loading=false;
 function setOpen(open){win.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'💬 Hide Chat':'💬 Open Chat';if(open&&!input.disabled)input.focus();}
 toggle.addEventListener('click',()=>setOpen(win.hidden));close.addEventListener('click',()=>setOpen(false));
 async function identity(){
  const {data:{user:current},error:authError}=await db.auth.getUser();if(authError)console.warn('Chat authentication:',authError.message);user=current;owner=false;profileName='Player';
  if(user){const [{data:p},{data:o}]=await Promise.all([db.from('profiles').select('display_name,username').eq('id',user.id).maybeSingle(),db.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle()]);profileName=String(p?.display_name?.trim()||p?.username?.trim()||'Player').slice(0,40);owner=Boolean(o);}
  input.disabled=!user;form.querySelector('button[type="submit"]').disabled=!user;
  input.placeholder=user?'Message the theater…':'Sign in to join the live chat';
  status.textContent=user?'Live theater chat • '+profileName+(owner?' • Owner moderation':''):'Live chat is viewable by everyone. Sign in to send messages.';
 }
 const seen=new Set();
 function render(item){
  if(seen.has(item.id))return;seen.add(item.id);
  const line=document.createElement('div');line.className='theater-chat-message'+(item.user_id===user?.id?' mine':'');
  const meta=document.createElement('div');meta.className='theater-chat-meta';
  const name=document.createElement('strong');name.textContent=item.display_name;
  const time=document.createElement('time');time.dateTime=item.created_at;time.textContent=new Date(item.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  meta.append(name,time);line.append(meta);
  const body=document.createElement('div');body.textContent=item.body;line.append(body);
  if(owner){const remove=document.createElement('button');remove.type='button';remove.className='theater-chat-delete';remove.textContent='Remove';remove.setAttribute('aria-label','Remove message from '+item.display_name);remove.addEventListener('click',async()=>{remove.disabled=true;const {error}=await db.from('theater_chat_messages').delete().eq('id',item.id);if(error){status.textContent='Could not remove message: '+error.message;remove.disabled=false;}else{seen.delete(item.id);line.remove();}});line.append(remove);}
  line.dataset.id=String(item.id);messages.append(line);while(messages.children.length>100){seen.delete(messages.firstChild.dataset.id);messages.firstChild.remove();}messages.scrollTop=messages.scrollHeight;
 }
 async function load(){
  if(loading)return;loading=true;
  const {data,error}=await db.from('theater_chat_messages').select('id,user_id,display_name,body,created_at').order('created_at',{ascending:false}).limit(100);
  if(error)status.textContent='Chat history unavailable: '+error.message;
  else{messages.replaceChildren();seen.clear();(data||[]).reverse().forEach(render);}
  loading=false;
 }
 await identity();await load();
 const channel=db.channel('theater-chat-live').on('postgres_changes',{event:'INSERT',schema:'public',table:'theater_chat_messages'},payload=>render(payload.new)).on('postgres_changes',{event:'DELETE',schema:'public',table:'theater_chat_messages'},payload=>{if(payload.old?.id){seen.delete(payload.old.id);messages.querySelectorAll('[data-id]').forEach(el=>{if(el.dataset.id===String(payload.old.id))el.remove();});}else load();}).subscribe(state=>{if(state==='CHANNEL_ERROR'||state==='TIMED_OUT')status.textContent='Chat connection interrupted. Refresh to reconnect.';});
 db.auth.onAuthStateChange(()=>{setTimeout(()=>identity().then(load).catch(console.error),0);});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!user)return;const body=input.value.trim();if(!body||body.length>300)return;
  const button=form.querySelector('button[type="submit"]');button.disabled=true;
  const {error}=await db.from('theater_chat_messages').insert({user_id:user.id,display_name:profileName,body});
  button.disabled=false;if(error)status.textContent='Message not sent: '+error.message;else{input.value='';status.textContent='Message sent';await load();input.focus();}
 });
 window.addEventListener('pagehide',()=>db.removeChannel(channel),{once:true});
})().catch(error=>{const el=document.getElementById('theater-chat-messages');if(el)el.textContent='Live chat could not connect: '+error.message;});
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


// Remove obsolete generic DVD drafts. Dark Side episodes and its cover use separate keys.
try{localStorage.removeItem('cartoon-universe-theater-youtube-drafts-v1');}catch{}
// Dark Side of the Ring: episodes grouped and sorted by season and episode number.
const darkCase=document.querySelector('.dark-side-dvd');
const darkPanel=document.getElementById('dark-side-episodes');
const darkForm=document.getElementById('dark-side-episode-form');
const darkKey='cartoon-universe-dark-side-episodes-v1';
function darkRead(){try{const x=JSON.parse(localStorage.getItem(darkKey)||'[]');return Array.isArray(x)?x.filter(e=>typeof e.title==='string'&&/^[A-Za-z0-9_-]{11}$/.test(e.id)).slice(0,50).map((e,i)=>({...e,season:Number.isInteger(Number(e.season))&&Number(e.season)>=1&&Number(e.season)<=99?Number(e.season):1,number:Number.isInteger(Number(e.number))&&Number(e.number)>=1&&Number(e.number)<=999?Number(e.number):i+1})):[];}catch{return [];}}
function darkRender(){const list=document.getElementById('dark-side-episode-list');list.replaceChildren();const episodes=darkRead().sort((a,b)=>a.season-b.season||a.number-b.number);document.getElementById('dark-side-episode-status').textContent=episodes.length?episodes.length+' episode(s) across '+new Set(episodes.map(e=>e.season)).size+' season(s), saved in this browser.':'No episodes added yet.';let currentSeason=null;for(const episode of episodes){if(episode.season!==currentSeason){currentSeason=episode.season;const heading=document.createElement('h4');heading.className='dark-side-season';heading.textContent='Season '+currentSeason;list.append(heading);}const row=document.createElement('div');row.className='dark-side-episode-row';const play=document.createElement('button');play.type='button';play.textContent='▶ Episode '+episode.number+': '+episode.title;play.addEventListener('click',()=>{document.getElementById('theater-youtube-url').value='https://www.youtube.com/watch?v='+episode.id;youtubeForm.requestSubmit();});const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.addEventListener('click',()=>{const next=darkRead().filter(e=>!(e.id===episode.id));localStorage.setItem(darkKey,JSON.stringify(next));darkRender();});row.append(play,remove);list.append(row);}}
if(darkCase&&darkPanel&&darkForm){darkCase.addEventListener('click',()=>{darkPanel.hidden=!darkPanel.hidden;darkCase.setAttribute('aria-expanded',String(!darkPanel.hidden));if(!darkPanel.hidden){darkRender();darkPanel.scrollIntoView({behavior:'smooth',block:'nearest'});}});darkForm.addEventListener('submit',event=>{event.preventDefault();const title=document.getElementById('dark-side-episode-title').value.trim();const id=youtubeVideoId(document.getElementById('dark-side-episode-url').value.trim());const season=Number(document.getElementById('dark-side-episode-season').value);const number=Number(document.getElementById('dark-side-episode-number').value);const status=document.getElementById('dark-side-episode-status');if(!title||!id||!Number.isInteger(season)||season<1||season>99||!Number.isInteger(number)||number<1||number>999){status.textContent='Enter a season, episode number, title and valid YouTube URL.';return;}try{const episodes=darkRead();if(episodes.length>=50){status.textContent='Maximum of 50 episodes reached.';return;}if(episodes.some(e=>e.id===id)){status.textContent='That video is already saved.';return;}if(episodes.some(e=>e.season===season&&e.number===number)){status.textContent='That season and episode number is already used.';return;}episodes.push({title:title.slice(0,100),id,season,number});localStorage.setItem(darkKey,JSON.stringify(episodes));darkForm.reset();document.getElementById('dark-side-episode-season').value=season;document.getElementById('dark-side-episode-number').value=number+1;darkRender();}catch{status.textContent='Browser storage unavailable. Episode not saved.';}});}

// Optional custom Dark Side cover, stored on this browser until server-side media uploads are ready.
const darkCoverKey='cartoon-universe-dark-side-cover-v1';
const darkCoverUpload=document.getElementById('dark-side-cover-upload');
function showDarkCover(data){const cover=document.querySelector('.dark-side-logo-art');if(!cover||!/^data:image\/(jpeg|png|webp);base64,/.test(data))return;cover.replaceChildren();const img=document.createElement('img');img.src=data;img.alt='Dark Side of the Ring custom DVD cover';img.style.cssText='width:100%;height:100%;object-fit:fill;display:block';img.onerror=()=>{try{localStorage.removeItem(darkCoverKey);}catch{}img.remove();const fallback=document.createElement('img');fallback.src='dark-side-ring-blue-cover.svg';fallback.alt='Dark Side of the Ring DVD cover';fallback.style.cssText='width:100%;height:100%;object-fit:fill;display:block';cover.append(fallback);};cover.style.padding='0';cover.append(img);}
try{const saved=localStorage.getItem(darkCoverKey);if(saved)showDarkCover(saved);}catch{}
if(darkCoverUpload)darkCoverUpload.addEventListener('change',()=>{const file=darkCoverUpload.files&&darkCoverUpload.files[0];const status=document.getElementById('dark-side-cover-status');if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2000000){status.textContent='Use a JPEG, PNG or WebP under 2 MB.';return;}const reader=new FileReader();reader.onload=()=>{try{localStorage.setItem(darkCoverKey,String(reader.result));showDarkCover(String(reader.result));status.textContent='Custom DVD cover saved on this browser.';}catch{status.textContent='Could not save the cover in browser storage.';}};reader.readAsDataURL(file);});

import('./theater-dvd-library.js?v=20261029-cover-display-3').catch(error=>{console.error(error);document.getElementById('dvd-selection').textContent='DVD library failed to load: '+error.message;});
