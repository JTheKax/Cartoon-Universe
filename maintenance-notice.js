// Visual maintenance notice for a static host. This does not secure static assets.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
async function showMaintenanceNotice(){
 // Always leave the authentication and password-recovery gateway accessible.
 // Otherwise maintenance redirects Owner sign-in back into its own overlay.
 const page=location.pathname.split('/').pop().toLowerCase();
 if(page==='login.html'||page==='register.html')return;
 const {data:state,error}=await client.from('site_maintenance').select('enabled,message').eq('id',true).maybeSingle();
 if(error||!state?.enabled)return;
 const {data:{user}}=await client.auth.getUser();
 if(user){
  const {data:owner,error:ownerError}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!ownerError&&owner)return;
 }
 const overlay=document.createElement('section');
 overlay.setAttribute('role','alert');
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#160b2c;color:white;display:grid;place-items:center;text-align:center;padding:24px';
 const inner=document.createElement('div');
 const title=document.createElement('h1');title.textContent='🛠️ Cartoon Universe — Under Maintenance';
 const message=document.createElement('p');message.textContent=state.message||'The haunted arcade will be back soon.';
 const link=document.createElement('a');link.href=new URL('login.html',location.href).href;link.textContent='Owner sign-in';link.style.color='#ffd178';
 inner.append(title,message,link);overlay.append(inner);document.body.append(overlay);
}
showMaintenanceNotice().catch(()=>{});
