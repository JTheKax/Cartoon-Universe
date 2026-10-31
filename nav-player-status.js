import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
import {isSupabaseConfigured} from './supabase-config.js';
const nameEl=document.getElementById('nav-player-name');
const balanceEl=document.getElementById('nav-player-balance');
if(nameEl&&balanceEl&&isSupabaseConfigured(SUPABASE_URL,SUPABASE_ANON_KEY)){
 const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 let request=0;
 async function refresh(){
  const current=++request;
  nameEl.textContent='Guest';balanceEl.textContent='—';
  try{
   const {data:{user},error}=await client.auth.getUser();
   if(current!==request||error||!user)return;
   const [profile,wallet]=await Promise.all([client.from('profiles').select('username,display_name').eq('id',user.id).maybeSingle(),client.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle()]);
   if(current!==request)return;
   nameEl.textContent=profile.data?.display_name||profile.data?.username||'Player';
   if(!wallet.error&&wallet.data?.balance!=null)balanceEl.textContent=Number(wallet.data.balance).toLocaleString();
  }catch{if(current===request){nameEl.textContent='Guest';balanceEl.textContent='—';}}
 }
 client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 refresh();
}
