import {isSupabaseConfigured} from './supabase-config.js';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const group=document.getElementById('admin-nav-group');
const trigger=document.getElementById('admin-nav');
const dropdown=document.getElementById('admin-dropdown');
if(group&&trigger&&dropdown){
 const close=()=>{dropdown.hidden=true;trigger.setAttribute('aria-expanded','false')};
 const hide=()=>{close();group.hidden=true;group.classList.remove('verified-owner')};
 hide();
 trigger.addEventListener('click',()=>{if(group.hidden)return;const open=dropdown.hidden;dropdown.hidden=!open;trigger.setAttribute('aria-expanded',String(open))});
 dropdown.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dropdown.hidden){close();trigger.focus()}});
 document.addEventListener('click',e=>{if(!group.contains(e.target))close()});
 if(isSupabaseConfigured(SUPABASE_URL,SUPABASE_ANON_KEY)){
  const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  let revision=0;
  async function refresh(){
   const current=++revision;hide();
   try{
    const {data:{user},error}=await client.auth.getUser();
    if(error||!user||current!==revision)return;
    const {data:owner,error:roleError}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
    if(current!==revision)return;
    if(!roleError&&owner){group.classList.add('verified-owner');group.hidden=false}
   }catch{if(current===revision)hide()}
  }
  client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
  refresh();
 }
}
