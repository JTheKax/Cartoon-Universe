import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const panel=document.getElementById('maintenance-panel');
const modeCurrent=document.getElementById('owner-mode-current');
const status=document.getElementById('maintenance-live-status');
const message=document.getElementById('maintenance-message');
const preview=document.getElementById('maintenance-preview-screen');
const output=document.getElementById('maintenance-preview-message');
const save=document.getElementById('maintenance-save');
const toggle=document.getElementById('maintenance-toggle');
let enabled=false;
let verifiedOwnerId=null;
async function load(){
 verifiedOwnerId=null;
 save.disabled=true;
 toggle.disabled=true;
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user)throw new Error('Sign in as owner.');
 const {data:owner,error:ownerError}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
 if(ownerError||!owner)throw new Error('Owner access required.');
 verifiedOwnerId=user.id;
 const {data,error}=await client.from('site_maintenance').select('enabled,message').eq('id',true).single();
 if(error)throw error;
 enabled=!!data.enabled;message.value=data.message||'We will be back soon!';
 status.textContent='Maintenance mode: '+(enabled?'ON':'OFF');
 if(modeCurrent)modeCurrent.textContent='Current mode: '+(enabled?'🛠️ Maintenance':'🟢 Live')+' (read-only)';
 toggle.textContent=enabled?'Turn maintenance OFF':'Turn maintenance ON';
 // Safety interlock: never enable until server-side enforcement is verified.
 toggle.disabled=true;
 toggle.title='Unavailable until server-side access enforcement is verified';
 save.disabled=false;
}
document.getElementById('maintenance-open')?.addEventListener('click',()=>{panel.hidden=false;load().catch(e=>{status.textContent=e.message;save.disabled=true;toggle.disabled=true;});});
document.getElementById('maintenance-close')?.addEventListener('click',()=>{panel.hidden=true;});
document.getElementById('maintenance-preview')?.addEventListener('click',()=>{output.textContent=message.value.trim()||'We will be back soon!';preview.hidden=false;});
save?.addEventListener('click',async()=>{
 save.disabled=true;
 let user;
 try {
  const result=await client.auth.getUser();
  user=result.data?.user;
  if(result.error||!user||user.id!==verifiedOwnerId){status.textContent='Owner session changed. Reload before saving.';save.disabled=false;return;}
 } catch {status.textContent='Unable to verify owner session.';save.disabled=false;return;}
 const value=message.value.trim();
 if(!value||value.length>280){status.textContent='Enter a message of 1–280 characters.';save.disabled=false;return;}
 try {
  const {data,error}=await client.from('site_maintenance').update({message:value,updated_by:user.id}).eq('id',true).select('id,message').maybeSingle();
  status.textContent=error?'Save failed: '+error.message:!data?'Save failed: maintenance record was not updated.':'Maintenance message saved.';
 } catch {status.textContent='Save failed. Check your connection and try again.';}
 finally {save.disabled=false;}
});

// Mode buttons are intentionally read-only until server-side gating is verified.
async function showCurrentMode(){if(!modeCurrent)return;try{const {data:{user}}=await client.auth.getUser();if(!user){modeCurrent.textContent='Current mode: sign in required';return;}const {data:owner}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();if(!owner){modeCurrent.textContent='Current mode: owner access required';return;}const {data,error}=await client.from('site_maintenance').select('enabled').eq('id',true).single();modeCurrent.textContent=error?'Current mode: unavailable':'Current mode: '+(data.enabled?'🛠️ Maintenance':'🟢 Live')+' (read-only)';}catch{modeCurrent.textContent='Current mode: unavailable';}}
showCurrentMode();

const pageModeList=document.getElementById('owner-page-mode-list');
const pageModeSummary=document.getElementById('owner-page-mode-summary');
const pageModes=[
 ['Home','index.html'],['Sets Overview','shop-collect.html'],['My Collection','shop-collect-my-collection.html'],
 ['My Scene','shop-collect-my-scene.html'],['Encyclopedia','shop-collect-encyclopedia.html'],
 ['Wishlist','shop-collect-wishlist.html'],['Collectibles','shop-collectibles.html'],
 ['Packs','shop-packs.html'],['My Shop','shop-my-shop.html'],['Auctions','shop-auctions.html'],
 ['Recycler','shop-recycler.html'],['Cards Overview','shop-cards.html'],['Card Battle','shop-cards-battle.html'],
 ['Deck Build','shop-cards-deck-build.html'],['Games Overview','shop-games.html'],
 ['Retro Games','shop-games-retro-games.html'],['Monster Catcher','shop-games-monster-catcher.html'],
 ['Arcade','shop-games-arcade.html'],['Prize Wheel','shop-games-prize-wheel.html'],
 ['Claw Machine','shop-games-claw-machine.html'],['Watch Overview','shop-watch.html'],
 ['Cartoons','shop-watch-cartoons.html'],['Anime','shop-watch-anime.html'],
 ['Movies','shop-watch-movies.html'],['Misc.','shop-watch-misc.html'],
 ['Community Overview','shop-community.html'],['Support','shop-community-support.html'],
 ['Forums','shop-community-forums.html'],['Help','shop-community-help.html'],
 ['Player Account','login.html'],['Register','register.html'],['Owner Dashboard','owner.html']
];
if(pageModeList){
 for(const [name,url] of pageModes){
  const row=document.createElement('div');row.className='owner-page-mode-row';
  const link=document.createElement('a');link.href=url;link.textContent=name;
  const actions=document.createElement('div');actions.className='owner-page-mode-actions';
  for(const [label,mode] of [['🟢 Live','live'],['🛠️ Maintenance','maintenance']]){
   const button=document.createElement('button');button.type='button';button.disabled=true;
   button.textContent=label;button.title='Page-level mode switching is not enabled';
   button.dataset.mode=mode;actions.append(button);
  }
  const note=document.createElement('small');note.textContent='Not configured';actions.append(note);
  row.append(link,actions);pageModeList.append(row);
 }
 if(pageModeSummary)pageModeSummary.textContent='Individual page modes: not configured. Global site mode is shown above.';
}
