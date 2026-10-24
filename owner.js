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
}
init().catch(()=>setStatus('Unable to load the dashboard. Check your connection and try again.'));
