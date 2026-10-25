import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const status=document.getElementById('owner-status');
const content=document.getElementById('owner-content');
const setStatus=(text)=>{status.textContent=text;status.hidden=false;};
async function init(){
 const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user){setStatus('Please sign in through Player Account to access this page.');return;}
 const {data:membership,error:roleError}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
 if(roleError){setStatus('Could not verify owner permissions. Please try again.');return;}
 if(!membership){setStatus('Access denied. This page is reserved for the Cartoon Universe owner.');return;}
 const {count,error:countError}=await client.from('profiles').select('id',{count:'exact',head:true});
 document.getElementById('player-count').textContent=countError?'Unavailable':String(count??0);
 content.hidden=false;status.hidden=true;
 await initMaintenance(client);
}
init().catch(()=>setStatus('Unable to load the dashboard. Check your connection and try again.'));

async function initMaintenance(client){
 const toggle=document.getElementById('maintenance-enabled');
 const message=document.getElementById('maintenance-message');
 const save=document.getElementById('maintenance-save');
 const feedback=document.getElementById('maintenance-feedback');
 const {data,error}=await client.from('site_maintenance').select('enabled,message').eq('id',true).single();
 if(error){feedback.textContent='Maintenance settings unavailable. Database migration may not be applied.';return;}
 toggle.checked=data.enabled;toggle.disabled=true;toggle.title='Activation requires server-side player action protection';message.value=data.message;
 save.addEventListener('click',async()=>{
  save.disabled=true;toggle.disabled=true;feedback.textContent='Saving…';
  const {error:saveError}=await client.from('site_maintenance').update({enabled:toggle.checked,message:message.value.trim()}).eq('id',true);
  feedback.textContent=saveError?'Save failed: check owner permissions and message length.':'Settings saved.';
  save.disabled=false;toggle.disabled=true;
 });
}
