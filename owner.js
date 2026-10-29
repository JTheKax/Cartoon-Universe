import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const status=document.getElementById('owner-status');
const content=document.getElementById('owner-content');
const setStatus=(text)=>{status.textContent=text;status.hidden=false;};
async function init(){
 const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user){
  setStatus('Your gateway verification is active, but the arcade Player Account session is missing. Sign in to Player Account on this gateway, then return to the Owner Dashboard.');
  const link=document.createElement('a');
  link.href='account.html';
  link.textContent='Open Player Account sign-in';
  link.style.display='inline-block';
  link.style.marginTop='12px';
  status.append(document.createElement('br'),link);
  return;
 }
 const {data:membership,error:roleError}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError){setStatus('Could not verify owner permissions. Please try again.');return;}
 if(!membership){setStatus('Access denied. This page is reserved for the Cartoon Universe owner.');return;}
 const {count,error:countError}=await client.from('profiles').select('id',{count:'exact',head:true});
 document.getElementById('player-count').textContent=countError?'Unavailable':String(count??0);
 content.hidden=false;status.hidden=true;
 // Refresh the short-lived gateway cookie only while this owner dashboard is visible.
 // The server rechecks Supabase owner membership on each refresh.
 const renew=async()=>{
  if(document.hidden)return;
  try{
   const response=await fetch('/__maintenance/owner-status',{credentials:'same-origin',cache:'no-store'});
   if(!response.ok||(await response.json()).ownerVerified!==true){
    clearInterval(heartbeat);content.hidden=true;
    setStatus('Owner verification expired. Verify your owner account again to reopen the dashboard.');
    const link=document.createElement('a');link.href='/__maintenance/owner-signin';link.textContent='Verify owner sign-in';
    status.append(document.createElement('br'),link);
   }
  }catch{/* Transient network errors do not grant access or change authorization. */}
 };
 const heartbeat=setInterval(renew,120000);
 window.addEventListener('pagehide',()=>clearInterval(heartbeat),{once:true});
}
init().catch(()=>setStatus('Unable to load the dashboard. Check your connection and try again.'));
