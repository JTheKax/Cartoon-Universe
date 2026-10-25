import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
// This is a visitor experience gate, not a security boundary.
// Server-side guards must protect all mutations before maintenance can be enabled.
const path=location.pathname.split('/').pop()||'index.html';
if(!['owner.html','maintenance.html'].includes(path)){
 try{
  const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const {data,error}=await client.from('site_maintenance').select('enabled').eq('id',true).single();
  if(!error&&data?.enabled){
   const {data:{user}}=await client.auth.getUser();
   let owner=false;
   if(user){
    const {data:member,error:memberError}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
    owner=!memberError&&!!member;
   }
   if(!owner)location.replace('maintenance.html');
  }
 }catch{
  // Do not lock everyone out when the database is unavailable.
 }
}
