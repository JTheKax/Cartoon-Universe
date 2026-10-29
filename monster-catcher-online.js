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
const localSaveKey='cu-monster-catcher-v2';
const controls=document.createElement('div');
controls.innerHTML='<button id="mc-team-save" disabled>Save team online</button><button id="mc-team-load" disabled>Load online team</button><label>Player ID <input id="mc-recipient" placeholder="Other player UUID" autocomplete="off"></label><button id="mc-battle" disabled>Invite to battle</button><button id="mc-trade" disabled>Request trade</button><p id="mc-invitation-status" role="status">Invitations are requests only; no monsters are transferred.</p>';
panel.append(controls);
const inviteStatus=controls.querySelector('#mc-invitation-status');
function setOnlineButtons(enabled){for(const id of ['mc-team-save','mc-team-load','mc-battle','mc-trade'])controls.querySelector('#'+id).disabled=!enabled;}
function readTeam(){const saved=JSON.parse(localStorage.getItem(localSaveKey)||'null');if(!Array.isArray(saved?.team))throw Error('Start an adventure before saving a team.');return saved.team.slice(0,6).map(m=>({name:String(m.name||'').slice(0,48),baseName:String(m.baseName||'').slice(0,48),level:Math.max(1,Math.min(100,Number(m.level)||1)),xp:Math.max(0,Number(m.xp)||0),hp:Math.max(1,Number(m.hp)||1),hpNow:Math.max(0,Number(m.hpNow)||0)}));}
async function saveTeam(){if(!sessionUser)throw Error('Join online first.');const {error}=await client.from('mc_teams').upsert({user_id:sessionUser.id,team:readTeam()},{onConflict:'user_id'});if(error)throw error;}
async function loadTeam(){if(!sessionUser)throw Error('Join online first.');const {data,error}=await client.from('mc_teams').select('team').eq('user_id',sessionUser.id).maybeSingle();if(error)throw error;if(!data)throw Error('No online team saved yet.');if(!Array.isArray(data.team)||data.team.length>6)throw Error('Invalid team data.');const saved=JSON.parse(localStorage.getItem(localSaveKey)||'{}');saved.team=data.team;localStorage.setItem(localSaveKey,JSON.stringify(saved));status.textContent='Team loaded. Reload the page to use it.';}
async function invite(kind){if(!sessionUser)throw Error('Join online first.');const recipient=controls.querySelector('#mc-recipient').value.trim();if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recipient)||recipient===sessionUser.id)throw Error('Enter another player’s valid account ID.');const {error}=await client.from('mc_invitations').insert({sender_id:sessionUser.id,recipient_id:recipient,kind});if(error)throw error;inviteStatus.textContent=kind+' invitation sent. Acceptance and resolution are not enabled yet.';}
for(const [id,fn] of [['mc-team-save',saveTeam],['mc-team-load',loadTeam],['mc-battle',()=>invite('battle')],['mc-trade',()=>invite('trade')]])controls.querySelector('#'+id).addEventListener('click',async()=>{try{await fn();if(id==='mc-team-save')status.textContent='Team saved online.';}catch(e){inviteStatus.textContent=e.message||'Online action failed.';}});
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
 positions.clear();sessionUser=null;setOnlineButtons(false);join.disabled=false;leave.disabled=true;status.textContent='Offline — local adventure is available.';refresh();
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
  await publish();heartbeat=setInterval(publish,750);
  leave.disabled=false;setOnlineButtons(true);status.textContent='Online — Starter Meadow. Team sync and invitation requests available in review.';
 }catch(e){await disconnect();status.textContent=e.message||'Could not connect.';}
});
leave.addEventListener('click',disconnect);
window.addEventListener('pagehide',()=>{clearInterval(heartbeat);channel?.unsubscribe();});
const ctx=canvas.getContext('2d'),original=window.requestAnimationFrame;
function overlay(){if(channel){drawPeers();}original(overlay);}
original(overlay);
