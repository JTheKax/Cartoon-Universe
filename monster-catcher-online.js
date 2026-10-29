import {isSupabaseConfigured} from './supabase-config.js';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';

const canvas=document.getElementById('game');
const panel=document.createElement('section');
panel.setAttribute('aria-label','Online multiplayer');
panel.innerHTML='<h2>Online World (early preview)</h2><p id="online-status" role="status">Offline — local adventure is available.</p><button id="online-connect" type="button">Join online world</button><button id="online-leave" type="button" disabled>Leave online world</button><p id="online-players">Nearby players: 0</p>';
canvas.insertAdjacentElement('afterend',panel);
const status=panel.querySelector('#online-status'),join=panel.querySelector('#online-connect'),leave=panel.querySelector('#online-leave'),count=panel.querySelector('#online-players');
let channel=null,client=null,heartbeat=null,sessionUser=null;
const positions=new Map();
function drawPeers(){
 if(!channel)return;
 const ctx=canvas.getContext('2d');
 for(const [id,p] of positions){
  if(id===sessionUser?.id||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<1||p.x>18||p.y<1||p.y>13)continue;
  ctx.fillStyle='#c084fc';ctx.fillRect(p.x*16+4,p.y*16+3,8,10);
  ctx.fillStyle='#fff';ctx.font='7px monospace';ctx.fillText('P',p.x*16+6,p.y*16+11);
 }
}
function refresh(){
 positions.clear();
 if(channel){
  for(const entries of Object.values(channel.presenceState())){
   for(const p of entries){if(typeof p.user_id==='string'&&p.user_id!==sessionUser?.id)positions.set(p.user_id,p);}
  }
 }
 count.textContent='Nearby players: '+positions.size;
}
function position(){
 try{const s=JSON.parse(localStorage.getItem('cu-monster-catcher-v2')||'null');return {x:Number.isInteger(s?.x)?Math.max(1,Math.min(18,s.x)):10,y:Number.isInteger(s?.y)?Math.max(1,Math.min(13,s.y)):7};}catch{return {x:10,y:7};}
}
async function disconnect(){
 clearInterval(heartbeat);heartbeat=null;
 if(channel){await client.removeChannel(channel);channel=null;}
 positions.clear();sessionUser=null;join.disabled=false;leave.disabled=true;status.textContent='Offline — local adventure is available.';refresh();
}
join.addEventListener('click',async()=>{
 join.disabled=true;status.textContent='Connecting…';
 try{
  if(!isSupabaseConfigured(SUPABASE_URL,SUPABASE_ANON_KEY))throw Error('Online service is not configured.');
  client ||= createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)throw Error('Sign in to your Cartoon Universe account before joining.');
  sessionUser=user;
  channel=client.channel('monster-catcher:starter-meadow',{config:{presence:{key:user.id}}});
  channel.on('presence',{event:'sync'},refresh);
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Connection timed out.')),12000);
   channel.subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(timeout);resolve();}else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){clearTimeout(timeout);reject(Error('Realtime channel unavailable.'));}});
  });
  const publish=()=>channel?.track({user_id:user.id,...position(),updated_at:Date.now()});
  await publish();heartbeat=setInterval(publish,300);
  leave.disabled=false;status.textContent='Online — Starter Meadow. Presence preview only; battles and trades are coming later.';
 }catch(e){await disconnect();status.textContent=e.message||'Could not connect.';}
});
leave.addEventListener('click',disconnect);
window.addEventListener('pagehide',()=>{clearInterval(heartbeat);channel?.unsubscribe();});
const ctx=canvas.getContext('2d'),original=window.requestAnimationFrame;
function overlay(){if(channel){drawPeers();}original(overlay);}
original(overlay);
