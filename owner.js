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
 const coinForm=document.getElementById('owner-coin-form');
 const coinStatus=document.getElementById('owner-coin-status');
 const coinSubmit=document.getElementById('owner-coin-submit');
 coinForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(coinSubmit.disabled)return;
  const username=document.getElementById('owner-coin-username').value.trim();
  const amount=Number(document.getElementById('owner-coin-amount').value);
  const reason=document.getElementById('owner-coin-reason').value.trim();
  const direction=document.getElementById('owner-coin-direction').value;
  if(!username||!Number.isSafeInteger(amount)||amount<1||amount>1000000||reason.length<3||reason.length>120){
   coinStatus.textContent='Enter an exact username, 1–1,000,000 coins, and a reason of 3–120 characters.';return;
  }
  const signedAmount=direction==='remove'?-amount:amount;
  if(!window.confirm((signedAmount>0?'Add ':'Remove ')+amount.toLocaleString()+' coins '+(signedAmount>0?'to ':'from ')+username+'?'))return;
  coinSubmit.disabled=true;coinStatus.textContent='Applying secure adjustment…';
  try{
   const {data,error}=await client.rpc('owner_adjust_cartoon_coins',{p_username:username,p_amount:signedAmount,p_reason:reason});
   if(error)throw error;
   coinStatus.textContent='Adjustment saved. New balance: '+Number(data).toLocaleString()+' Cartoon Coins.';
   coinForm.reset();
  }catch(error){
   coinStatus.textContent='Adjustment not applied: '+(error?.message||'Secure backend unavailable.');
  }finally{coinSubmit.disabled=false;}
 });
}
init().catch(()=>setStatus('Unable to load the dashboard. Check your connection and try again.'));
