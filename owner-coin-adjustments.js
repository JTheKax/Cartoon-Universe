import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const form=document.getElementById('owner-coin-form');
const submit=document.getElementById('owner-coin-submit');
const status=document.getElementById('owner-coin-status');
if(form&&submit&&status){
 submit.disabled=true;
 async function verify(){const {data:{user},error}=await db.auth.getUser();if(error||!user){status.textContent='Sign in to your owner account first.';return;}const {data:owner,error:roleError}=await db.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();if(roleError||!owner){status.textContent='Owner authorization required.';return;}submit.disabled=false;status.textContent='Owner verified. Adjustments are recorded in the transaction history.';}
 form.addEventListener('submit',async e=>{e.preventDefault();if(submit.disabled)return;const username=document.getElementById('owner-coin-username').value.trim();const amount=Number(document.getElementById('owner-coin-amount').value);const reason=document.getElementById('owner-coin-reason').value.trim();const direction=document.getElementById('owner-coin-direction').value;if(!username||!Number.isSafeInteger(amount)||amount<1||amount>1000000||reason.length<3||reason.length>120){status.textContent='Enter a valid username, 1–1,000,000 coins and a reason (3–120 characters).';return;}const signed=direction==='remove'?-amount:amount;if(!confirm((signed<0?'Remove ':'Add ')+amount.toLocaleString()+' Cartoon Coins '+(signed<0?'from ':'to ')+username+'?'))return;submit.disabled=true;status.textContent='Applying secure adjustment…';try{const {data,error}=await db.rpc('owner_adjust_cartoon_coins',{p_username:username,p_amount:signed,p_reason:reason});if(error){status.textContent='Adjustment not applied: '+error.message;return;}status.textContent='Adjustment saved. '+username+' now has '+Number(data).toLocaleString()+' Cartoon Coins.';form.reset();}catch{status.textContent='Could not reach the coin service. No confirmed adjustment.';}finally{submit.disabled=false;}});
 verify().catch(()=>{status.textContent='Owner verification unavailable.';});
}
