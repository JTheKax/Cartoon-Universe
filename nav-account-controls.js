import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const nameEl=document.getElementById('nav-player-name');
const balanceEl=document.getElementById('nav-player-balance');
const ownerBadge=document.getElementById('nav-owner-badge');
const ownerTab=document.getElementById('nav-owner-tab');
const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const loginLink=document.getElementById('nav-login-link'),logoutButton=document.getElementById('nav-logout-button'),registerLink=document.getElementById('nav-register-link');
function showAccountActions(signedIn){if(loginLink)loginLink.hidden=signedIn;if(logoutButton)logoutButton.hidden=!signedIn;if(registerLink)registerLink.hidden=signedIn;}
// Revoking the Supabase session alone leaves the gateway's owner cookie valid
// until its short TTL. Explicitly clear that server-side session first.
async function clearOwnerGatewaySession(){
 if(location.pathname!=='/__maintenance/arcade'&&!location.pathname.startsWith('/__maintenance/arcade/'))return;
 const response=await fetch('/__maintenance/verify-session',{method:'DELETE',credentials:'same-origin',redirect:'error',cache:'no-store'});
 if(!response.ok)throw new Error('Owner gateway logout could not be confirmed.');
}
logoutButton?.addEventListener('click',async()=>{logoutButton.disabled=true;try{await clearOwnerGatewaySession();const {error}=await client.auth.signOut();if(error)throw error;showAccountActions(false);await refresh();}catch{alert('Could not fully log out. Please try again.');}finally{logoutButton.disabled=false;}});
let sequence=0;
let displayedUserId=null;
async function refresh(){
 const id=++sequence;
 try{
  const {data:{session}}=await client.auth.getSession();
  if(id!==sequence)return;
  if(!session?.user){displayedUserId=null;ownerBadge.hidden=true;ownerTab.hidden=true;showAccountActions(false);nameEl.textContent='Guest';balanceEl.textContent='—';return;}
  showAccountActions(true);
  const user=session.user;
  if(displayedUserId!==user.id){displayedUserId=user.id;nameEl.textContent=user.user_metadata?.username||user.user_metadata?.display_name||'Loading name…';}
  const [profile,wallet,owner]=await Promise.all([client.from('profiles').select('username,display_name').eq('id',user.id).maybeSingle(),client.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle(),client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle()]);
  if(id!==sequence)return;
  ownerBadge.hidden=!!owner.error||!owner.data;
  ownerTab.hidden=ownerBadge.hidden;
  if(profile.data){const verifiedName=profile.data.username||profile.data.display_name;if(verifiedName)nameEl.textContent=verifiedName;}
  balanceEl.textContent=!wallet.error&&wallet.data?.balance!=null?Number(wallet.data.balance).toLocaleString():'—';
 }catch{if(id===sequence){ownerBadge.hidden=true;ownerTab.hidden=true;nameEl.textContent='Account unavailable';balanceEl.textContent='—';}}
}
// Re-establish the separate gateway owner session from the current signed-in
// Supabase session when an authenticated owner chooses the Owner tab.
// The gateway independently validates the bearer token and owner membership.
ownerTab?.addEventListener('click',async event=>{
 event.preventDefault();
 if(ownerTab.hidden)return;
 ownerTab.setAttribute('aria-busy','true');
 try{
  const {data:{session},error}=await client.auth.getSession();
  if(error||!session?.access_token)throw new Error('Not signed in');
  const response=await fetch('/__maintenance/verify-session',{
   method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
   headers:{'Authorization':'Bearer '+session.access_token}
  });
  if(!response.ok)throw new Error('Owner verification required');
  window.location.assign(ownerTab.href);
 }catch{
  window.location.assign('/__maintenance/owner-signin');
 }finally{ownerTab.removeAttribute('aria-busy');}
});
client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
window.addEventListener('pageshow',refresh);
refresh();
