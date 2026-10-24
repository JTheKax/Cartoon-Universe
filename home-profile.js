import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const panel=document.getElementById('home-player-dashboard');
if(panel&&SUPABASE_URL.startsWith('https://')&&SUPABASE_ANON_KEY.length>30){
 const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 const guest=document.getElementById('home-profile-guest');
 const signedIn=document.getElementById('home-profile-signed-in');
 const status=document.getElementById('home-profile-status');
 const presenceSelect=document.getElementById('home-presence-mode');
 let activeUserId=null;
 const presenceModes=new Set(['online','away','offline','dnd']);
 presenceSelect?.addEventListener('change',async()=>{
  if(!activeUserId)return;
  const userId=activeUserId,mode=presenceSelect.value;
  if(!presenceModes.has(mode))return;
  presenceSelect.disabled=true;
  const {error}=await client.from('profiles').update({presence_mode:mode}).eq('id',userId);
  presenceSelect.disabled=false;
  if(error){status.textContent='Could not save status. Please try again.';refresh();}
  else status.textContent='Status saved: '+presenceSelect.selectedOptions[0].textContent.trim();
 });
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 let refreshId=0;
 async function refresh(){
  const id=++refreshId;
  try{
   const {data:{user},error}=await client.auth.getUser();
   if(id!==refreshId)return;
   if(error||!user){activeUserId=null;signedIn.hidden=true;guest.hidden=false;status.textContent='Sign in to view your player dashboard.';return}
   const [profileResult,ownerResult,walletResult]=await Promise.all([
    client.from('profiles').select('username,display_name,avatar_color,presence_mode').eq('id',user.id).maybeSingle(),
    client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle(),
    client.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle()
   ]);
   if(id!==refreshId)return;
   const profile=profileResult.data;
   activeUserId=user.id;
   if(presenceSelect)presenceSelect.value=presenceModes.has(profile?.presence_mode)?profile.presence_mode:'offline';
   const username=profile?.username||'Player';
   const name=profile?.display_name||username;
   set('home-profile-name',name);
   set('home-profile-handle','@'+username);
   const avatar=document.getElementById('home-profile-avatar');
   avatar.textContent=name.trim().slice(0,2).toUpperCase()||'CU';
   const color=profile?.avatar_color;
   avatar.style.backgroundColor=/^#[0-9a-f]{6}$/i.test(color||'')?color:'#ff4ca8';
   const balance=walletResult.data?.balance;
   set('home-coins-balance',walletResult.error||balance==null?'—':Number(balance).toLocaleString());
   const owner=!ownerResult.error&&!!ownerResult.data;
   document.getElementById('home-profile-role').textContent=owner?'👑 Owner':'🎮 Player';
   document.getElementById('home-owner-link').hidden=!owner;
   signedIn.hidden=false;guest.hidden=true;
   status.textContent=profileResult.error?'Signed in. Some profile details could not be loaded.':'Your player profile is ready.';
  }catch{
   if(id!==refreshId)return;
   activeUserId=null;signedIn.hidden=true;guest.hidden=false;status.textContent='Profile temporarily unavailable. You can still open your account.';
  }
 }
 client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 refresh();
}else if(panel){
 document.getElementById('home-profile-status').textContent='Sign in to see your player profile.';
}
