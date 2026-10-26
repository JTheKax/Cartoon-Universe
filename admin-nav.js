import {isSupabaseConfigured} from './supabase-config.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const link=document.getElementById('admin-nav');
if(link && isSupabaseConfigured(SUPABASE_URL,SUPABASE_ANON_KEY)){
 const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 async function refresh(){link.hidden=true;try{
 const {data:{user},error}=await client.auth.getUser();if(error||!user)return;
 const {data:owner,error:roleError}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
 link.hidden=!!roleError||!owner;
 }catch{link.hidden=true;}}
 client.auth.onAuthStateChange(()=>setTimeout(refresh,0));refresh();
}
