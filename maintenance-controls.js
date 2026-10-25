import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const panel=document.getElementById('maintenance-panel');
const status=document.getElementById('maintenance-live-status');
const message=document.getElementById('maintenance-message');
const preview=document.getElementById('maintenance-preview-screen');
const output=document.getElementById('maintenance-preview-message');
const save=document.getElementById('maintenance-save');
const toggle=document.getElementById('maintenance-toggle');
let enabled=false;
let verifiedOwnerId=null;
async function load(){
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user)throw new Error('Sign in as owner.');
 const {data:owner,error:ownerError}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
 if(ownerError||!owner)throw new Error('Owner access required.');
 verifiedOwnerId=user.id;
 const {data,error}=await client.from('site_maintenance').select('enabled,message').eq('id',true).single();
 if(error)throw error;
 enabled=!!data.enabled;message.value=data.message||'We will be back soon!';
 status.textContent='Maintenance mode: '+(enabled?'ON':'OFF');
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
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user||user.id!==verifiedOwnerId){status.textContent='Owner session changed. Reload before saving.';return;}
 const value=message.value.trim();
 if(!value||value.length>280){status.textContent='Enter a message of 1–280 characters.';save.disabled=false;return;}
 const {error}=await client.from('site_maintenance').update({message:value,updated_by:user.id}).eq('id',true);
 status.textContent=error?'Save failed: '+error.message:'Maintenance message saved.';
 save.disabled=false;
});
