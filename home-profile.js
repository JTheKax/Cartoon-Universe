import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const panel=document.getElementById('home-player-dashboard');
if(panel&&SUPABASE_URL.startsWith('https://')&&SUPABASE_ANON_KEY.length>30){
 const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 const guest=document.getElementById('home-profile-guest');
 const signedIn=document.getElementById('home-profile-signed-in');
 const status=document.getElementById('home-profile-status');
 const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
 let refreshId=0;
 async function refresh(){
  const id=++refreshId;
  try{
   const {data:{user},error}=await client.auth.getUser();
   if(id!==refreshId)return;
   if(error||!user){signedIn.hidden=true;guest.hidden=false;status.textContent='Sign in to view your player dashboard.';return}
   const [profileResult,ownerResult]=await Promise.all([
    client.from('profiles').select('username,display_name,avatar_color').eq('id',user.id).maybeSingle(),
    client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle()
   ]);
   if(id!==refreshId)return;
   const profile=profileResult.data;
   const username=profile?.username||'Player';
   const name=profile?.display_name||username;
   set('home-profile-name',name);
   set('home-profile-handle','@'+username);
   const avatar=document.getElementById('home-profile-avatar');
   avatar.textContent=name.trim().slice(0,2).toUpperCase()||'CU';
   const color=profile?.avatar_color;
   avatar.style.backgroundColor=/^#[0-9a-f]{6}$/i.test(color||'')?color:'#ff4ca8';
   const owner=!ownerResult.error&&!!ownerResult.data;
   document.getElementById('home-profile-role').textContent=owner?'👑 Owner':'🎮 Player';
   document.getElementById('home-owner-link').hidden=!owner;
   signedIn.hidden=false;guest.hidden=true;
   status.textContent=profileResult.error?'Signed in. Some profile details could not be loaded.':'Your player profile is ready.';
  }catch{
   if(id!==refreshId)return;
   signedIn.hidden=true;guest.hidden=false;status.textContent='Profile temporarily unavailable. You can still open your account.';
  }
 }
 client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 refresh();
}else if(panel){
 document.getElementById('home-profile-status').textContent='Sign in to see your player profile.';
}
