import {isSupabaseConfigured} from './supabase-config.js';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const el=id=>document.getElementById(id), player=el('theater-player'),status=el('theater-status'),message=el('theater-message');
if(player){
 const client=isSupabaseConfigured(SUPABASE_URL,SUPABASE_ANON_KEY)?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
 let programs=[],live=null,owner=false,activeKey='',started=0;
 const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname?u.href:null}catch{return null}};
 const say=(id,text)=>{el(id).textContent=text};
 let hls=null;
 player.addEventListener('error',()=>{const code=player.error?.code;message.textContent=code===4?'This URL is not a supported video stream, or the host blocks playback. Use a direct HTTPS MP4/WebM or HLS .m3u8 URL.':'Video playback failed. Check the media URL, host permissions, and network.'});
 const embed=el('theater-embed');
 const parseMedia=value=>{
  const url=safeURL(value);if(!url)return null;
  const u=new URL(url),host=u.hostname.toLowerCase();
  if(host==='youtu.be'||host==='youtube.com'||host==='www.youtube.com'||host==='m.youtube.com'||host==='www.youtube-nocookie.com'){
   const id=host==='youtu.be'?u.pathname.slice(1):u.pathname.startsWith('/shorts/')||u.pathname.startsWith('/live/')||u.pathname.startsWith('/embed/')?u.pathname.split('/')[2]:u.searchParams.get('v');
   return id&&/^[a-zA-Z0-9_-]{11}$/.test(id)?{type:'youtube',url:'https://www.youtube-nocookie.com/embed/'+id}:null;
  }
  if((host==='megacartoons.net'||host==='www.megacartoons.net')&&/^\/[a-z0-9-]+\/$/i.test(u.pathname)&&!u.search&& !u.hash)return {type:'external-embed',url};
  if(/\.m3u8$/i.test(u.pathname))return {type:'hls',url};
  if(/\.(mp4|webm|ogg|ogv)$/i.test(u.pathname))return {type:'video',url};
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
  if(media.type==='youtube'||media.type==='external-embed'){
   player.hidden=true;embed.hidden=false;
   const frame=document.createElement('iframe');
   frame.title='Cartoon Universe video';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;
   frame.referrerPolicy='strict-origin-when-cross-origin';
   const u=new URL(media.url);if(media.type==='youtube'){u.searchParams.set('start',String(Math.floor(offset)));u.searchParams.set('autoplay','0')}
   if(media.type==='external-embed'){frame.allow='autoplay; fullscreen; picture-in-picture';frame.loading='eager'}
   frame.src=u.href;embed.append(frame);
   message.textContent=media.type==='external-embed'?'Episode loaded automatically. Press Play inside the embedded player if your browser or the video host prevents autoplay.':'YouTube playback depends on embedding permissions. Scheduled seeking is approximate.';return;
  }
  const seek=()=>{if(Number.isFinite(player.duration)&&offset<player.duration)try{player.currentTime=offset}catch{};player.removeEventListener('loadedmetadata',seek)};
  player.addEventListener('loadedmetadata',seek);
  if(media.type==='hls'&&!player.canPlayType('application/vnd.apple.mpegurl')){
   try{
    const {default:Hls}=await import('https://esm.sh/hls.js@1.6.13');
    if(key!==activeKey)return;
    if(!Hls.isSupported())throw Error('HLS is unsupported in this browser');
    hls=new Hls();hls.on(Hls.Events.ERROR,(_event,data)=>{if(data.fatal)message.textContent='HLS stream failed ('+data.type+'). Check stream availability, HTTPS and cross-origin (CORS) permissions.'});hls.loadSource(media.url);hls.attachMedia(player);
   }catch{say('theater-message','HLS playback is unavailable. Check your stream URL and browser.');return}
  }else{player.src=media.url;player.load()}
  player.play().catch(()=>say('theater-message','Press play to start watching. Browser autoplay may be blocked.'));
 }
 function render(){
  const list=el('theater-schedule');list.replaceChildren();
  for(const p of programs){const li=document.createElement('li');li.textContent=p.title+' · '+p.duration_minutes+' min';list.append(li)}
  if(!programs.length){const li=document.createElement('li');li.textContent='No programs scheduled yet.';list.append(li)}
  if(live?.enabled&&parseMedia(live.media_url)){
   status.textContent='🔴 LIVE NOW';el('theater-now').textContent=live.title;el('theater-marquee-label').textContent='🔴 LIVE PREMIERE';el('theater-marquee-program').textContent=live.title;
   play(live.media_url,'live:'+live.id+':'+live.updated_at);
   message.textContent='Owner live broadcast is on air.';return;
  }
  const valid=programs.filter(p=>parseMedia(p.media_url)&&p.duration_minutes>0);
  const total=valid.reduce((sum,p)=>sum+p.duration_minutes*60,0);
  if(!total){status.textContent='⚫ OFF AIR';el('theater-now').textContent='';el('theater-marquee-label').textContent='COMING SOON';el('theater-marquee-program').textContent='STAY TUNED';play(null);message.textContent='The owner has not scheduled a playable channel yet.';return}
  // Shared UTC epoch anchors the same schedule across viewers and page reloads.
  let t=Math.floor(Date.now()/1000)%total,chosen=valid[0],offset=0;
  for(const p of valid){const duration=p.duration_minutes*60;if(t<duration){chosen=p;offset=t;break}t-=duration}
  status.textContent='🟢 24/7 PROGRAMMING';el('theater-now').textContent='Now playing: '+chosen.title;el('theater-marquee-label').textContent='NOW PLAYING';el('theater-marquee-program').textContent=chosen.title;
  play(safeURL(chosen.media_url),'program:'+chosen.id,offset);
  message.textContent='Scheduled playback; availability depends on the video host.';
 }
 async function refresh(){
  if(!client){status.textContent='⚫ NOT CONFIGURED';message.textContent='Streaming requires Supabase configuration.';return}
  const [p,l]=await Promise.all([client.from('theater_programs').select('id,title,media_url,duration_minutes,sort_order').eq('enabled',true).order('sort_order'),client.from('theater_live').select('id,title,media_url,enabled,updated_at').eq('id',1).maybeSingle()]);
  if(p.error||l.error){status.textContent='⚫ UNAVAILABLE';message.textContent='The theater database is not ready. Apply the reviewed migration before enabling.';return}
  programs=p.data||[];live=l.data;render();
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
  if(!url||!Number.isInteger(duration)||duration<1||duration>1440){say('theater-owner-message','Use an HTTPS MP4/WebM/OGG file, HLS .m3u8 playlist, YouTube video, or supported MegaCartoons episode URL, plus a valid duration.');return}
  const {error}=await client.from('theater_programs').insert({title:String(data.get('title')).trim(),media_url:url,duration_minutes:duration,sort_order:programs.length,enabled:true});
  say('theater-owner-message',error?error.message:'Program saved. Loading theater channel…');if(!error){e.currentTarget.reset();activeKey='';await refresh()}
 });
 el('theater-live-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!owner)return;
  const data=new FormData(e.currentTarget),url=parseMedia(data.get('media_url'))?.url;
  if(!url){say('theater-owner-message','Use an HTTPS MP4/WebM/OGG file, HLS .m3u8 stream, YouTube link, or supported MegaCartoons episode URL.');return}
  const {error}=await submit('theater_live',{id:1,title:String(data.get('title')).trim(),media_url:url,enabled:true,updated_at:new Date().toISOString()});
  say('theater-owner-message',error?error.message:'Live override enabled.');if(!error)await refresh();
 });
 el('theater-stop-live').addEventListener('click',async()=>{
  if(!owner)return;
  const {error}=await client.from('theater_live').update({enabled:false,updated_at:new Date().toISOString()}).eq('id',1);
  say('theater-owner-message',error?error.message:'Playlist resumed.');if(!error)await refresh();
 });
 if(client){client.auth.onAuthStateChange(()=>setTimeout(checkOwner,0));checkOwner();refresh();setInterval(refresh,30000);setInterval(render,10000)}else refresh();
}

// External chat controller: inline scripts are blocked by the protected owner gateway CSP.
if(document.getElementById('theater-chat-toggle')){
(()=>{const toggle=document.getElementById('theater-chat-toggle'),win=document.getElementById('theater-chat-window'),close=document.getElementById('theater-chat-close'),form=document.getElementById('theater-chat-form'),input=document.getElementById('theater-chat-input'),messages=document.getElementById('theater-chat-messages');function setOpen(open){win.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)input.focus()}toggle.addEventListener('click',()=>setOpen(win.hidden));close.addEventListener('click',()=>setOpen(false));form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!value)return;const item=document.createElement('div');item.className='theater-chat-message mine';item.textContent=value;messages.append(item);messages.scrollTop=messages.scrollHeight;input.value='';input.focus()})})();
}
