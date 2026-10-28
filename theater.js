import {isSupabaseConfigured} from './supabase-config.js';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const el=id=>document.getElementById(id), player=el('theater-player'),status=el('theater-status'),message=el('theater-message');
if(player){
 const client=isSupabaseConfigured(SUPABASE_URL,SUPABASE_ANON_KEY)?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
 let programs=[],owner=false,activeKey='';
 const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname?u.href:null}catch{return null}};
 const say=(id,text)=>{el(id).textContent=text};
 let hls=null;
 const embed=el('theater-embed');
 const parseMedia=value=>{
  const url=safeURL(value);if(!url)return null;
  const u=new URL(url),host=u.hostname.toLowerCase();
  if(host==='youtu.be'||host==='youtube.com'||host==='www.youtube.com'||host==='m.youtube.com'||host==='www.youtube-nocookie.com'){
   const id=host==='youtu.be'?u.pathname.slice(1):u.pathname.startsWith('/shorts/')||u.pathname.startsWith('/live/')?u.pathname.split('/')[2]:u.searchParams.get('v');
   return id&&/^[a-zA-Z0-9_-]{11}$/.test(id)?{type:'youtube',url:'https://www.youtube-nocookie.com/embed/'+id}:null;
  }
  if(/\.m3u8$/i.test(u.pathname))return {type:'hls',url};
  if(/\.(mp4|webm)$/i.test(u.pathname))return {type:'video',url};
  return null;
 };
 async function play(raw,key,offset=0){
  const media=parseMedia(raw);
  if(!media){if(activeKey){player.pause();player.removeAttribute('src');player.load();embed.replaceChildren();embed.hidden=true;activeKey=''}return}
  if(key===activeKey)return;
  activeKey=key;
  player.pause();player.removeAttribute('src');player.load();
  if(hls){hls.destroy();hls=null}
  embed.replaceChildren();embed.hidden=true;player.hidden=false;
  if(media.type==='youtube'){
   player.hidden=true;embed.hidden=false;
   const frame=document.createElement('iframe');
   frame.title='Cartoon Universe video';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;
   frame.referrerPolicy='strict-origin-when-cross-origin';
   const u=new URL(media.url);u.searchParams.set('start',String(Math.floor(offset)));u.searchParams.set('autoplay','0');
   frame.src=u.href;embed.append(frame);
   message.textContent='YouTube playback depends on embedding permissions. Scheduled seeking is approximate.';return;
  }
  const seek=()=>{if(Number.isFinite(player.duration)&&offset<player.duration)try{player.currentTime=offset}catch{};player.removeEventListener('loadedmetadata',seek)};
  player.addEventListener('loadedmetadata',seek);
  if(media.type==='hls'&&!player.canPlayType('application/vnd.apple.mpegurl')){
   try{
    const {default:Hls}=await import('https://esm.sh/hls.js@1.6.13');
    if(key!==activeKey)return;
    if(!Hls.isSupported())throw Error('HLS is unsupported in this browser');
    hls=new Hls();hls.loadSource(media.url);hls.attachMedia(player);
   }catch{say('theater-message','HLS playback is unavailable. Check your stream URL and browser.');return}
  }else{player.src=media.url;player.load()}
  player.play().catch(()=>say('theater-message','Press play to start watching. Browser autoplay may be blocked.'));
 }
 function render(){
  const library=el('theater-library');library.replaceChildren();
  if(!programs.length){const p=document.createElement('p');p.textContent='No movies in the library yet.';library.append(p);return}
  for(const movie of programs){
   if(!parseMedia(movie.media_url))continue;
   const dvd=document.createElement('button');dvd.type='button';dvd.className='dvd-case';dvd.setAttribute('aria-pressed',String(activeKey==='movie:'+movie.id));
   const icon=document.createElement('span');icon.className='dvd-icon';icon.textContent='📀';
   const title=document.createElement('strong');title.textContent=movie.title;
   const duration=document.createElement('small');duration.textContent=movie.duration_minutes+' min · PLAY MOVIE';
   dvd.append(icon,title,duration);
   dvd.addEventListener('click',()=>{status.textContent='▶ NOW PLAYING';el('theater-now').textContent=movie.title;el('theater-marquee-label').textContent='NOW SHOWING';el('theater-marquee-program').textContent=movie.title;play(movie.media_url,'movie:'+movie.id);message.textContent='Selected: '+movie.title+'. Press play if autoplay is blocked.';render()});
   library.append(dvd);
  }
  if(!library.children.length){const p=document.createElement('p');p.textContent='No playable movies are available.';library.append(p)}
 }
 async function refresh(){
  if(!client){status.textContent='⚫ NOT CONFIGURED';message.textContent='Movie library requires Supabase configuration.';return}
  const {data,error}=await client.from('theater_programs').select('id,title,media_url,duration_minutes,sort_order').eq('enabled',true).order('sort_order');
  if(error){status.textContent='⚫ UNAVAILABLE';message.textContent='The movie library database is not ready. A reviewed migration is required.';return}
  programs=data||[];render();
 }
 async function checkOwner(){
  if(!client)return;
  const {data:{user}}=await client.auth.getUser();owner=false;
  if(user){const r=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();owner=!r.error&&!!r.data}
  el('theater-owner').hidden=!owner;
 }
 const submit=async(table,record)=>{if(!owner)return {error:{message:'Owner verification required'}};return client.from(table).upsert(record)};
 el('theater-program-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!owner)return;
  const data=new FormData(e.currentTarget),url=parseMedia(data.get('media_url'))?.url,duration=Number(data.get('duration'));
  if(!url||!Number.isInteger(duration)||duration<1||duration>1440){say('theater-owner-message','Use a valid HTTPS URL and duration.');return}
  const {error}=await client.from('theater_programs').insert({title:String(data.get('title')).trim(),media_url:url,duration_minutes:duration,sort_order:programs.length,enabled:true});
  say('theater-owner-message',error?error.message:'Movie added to library.');if(!error){e.currentTarget.reset();await refresh()}
 });
 if(client){client.auth.onAuthStateChange(()=>setTimeout(checkOwner,0));checkOwner();refresh()}else refresh();
}

// External chat controller: inline scripts are blocked by the protected owner gateway CSP.
if(document.getElementById('theater-chat-toggle')){
(()=>{const toggle=document.getElementById('theater-chat-toggle'),win=document.getElementById('theater-chat-window'),close=document.getElementById('theater-chat-close'),form=document.getElementById('theater-chat-form'),input=document.getElementById('theater-chat-input'),messages=document.getElementById('theater-chat-messages');function setOpen(open){win.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)input.focus()}toggle.addEventListener('click',()=>setOpen(win.hidden));close.addEventListener('click',()=>setOpen(false));form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!value)return;const item=document.createElement('div');item.className='theater-chat-message mine';item.textContent=value;messages.append(item);messages.scrollTop=messages.scrollHeight;input.value='';input.focus()})})();
}
