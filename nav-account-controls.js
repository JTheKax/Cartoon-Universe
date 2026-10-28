import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const nameEl=document.getElementById('nav-player-name');
const balanceEl=document.getElementById('nav-player-balance');
const ownerBadge=document.getElementById('nav-owner-badge');
const ownerTab=document.getElementById('nav-owner-tab');
const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const loginLink=document.getElementById('nav-login-link'),logoutButton=document.getElementById('nav-logout-button'),registerLink=document.getElementById('nav-register-link');
function showAccountActions(signedIn){if(loginLink)loginLink.hidden=signedIn;if(logoutButton)logoutButton.hidden=!signedIn;if(registerLink)registerLink.hidden=signedIn;}
logoutButton?.addEventListener('click',async()=>{logoutButton.disabled=true;const {error}=await client.auth.signOut();logoutButton.disabled=false;if(!error){showAccountActions(false);await refresh();}else alert('Could not log out. Please try again.');});
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
client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
window.addEventListener('pageshow',refresh);
refresh();
