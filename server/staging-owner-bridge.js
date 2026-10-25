// Served only by the staging gateway, never added to the production static site.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from '/config.js';
const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const status=document.createElement('p');
status.setAttribute('role','status');
document.querySelector('main').prepend(status);
const dashboard=document.createElement('a');
dashboard.href='/owner.html';dashboard.textContent='Open staging owner dashboard';dashboard.hidden=true;
status.after(dashboard);
let sequence=0;
// Serialize session updates so an earlier login cannot overwrite a later logout.
let pending=Promise.resolve();
function sync(session){
 const current=++sequence;
 pending=pending.catch(()=>{}).then(async()=>{
  if(current!==sequence)return;
  dashboard.hidden=true;
  try{
   const response=await fetch('/__maintenance/session',{
    method:session?.access_token?'POST':'DELETE',credentials:'same-origin',
    headers:session?.access_token?{Authorization:'Bearer '+session.access_token}:{}
   });
   if(current!==sequence)return;
   dashboard.hidden=!session?.access_token||!response.ok;
   status.textContent=dashboard.hidden?'Staging gateway: sign in as owner to unlock protected pages.':'Staging owner access verified for five minutes.';
  }catch{if(current===sequence)status.textContent='Staging owner verification unavailable. Try signing in again.';}
 });
}
client.auth.onAuthStateChange((_event,session)=>sync(session));
