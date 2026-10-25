import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const balance=document.getElementById('wallet-balance');
const claim=document.getElementById('wallet-claim');
const status=document.getElementById('wallet-status');
const next=document.getElementById('wallet-next-claim');
const history=document.getElementById('wallet-transactions');
let currentUser=null;
let refreshSequence=0;
let claimPending=false;
const number=n=>Number(n).toLocaleString();
function row(message){history.replaceChildren();const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=3;td.textContent=message;tr.append(td);history.append(tr)}
function nextUtc(){const d=new Date();return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1)).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC'}
async function refresh(){
 const sequence=++refreshSequence;
 const {data:{user},error:authError}=await client.auth.getUser();
 if(sequence!==refreshSequence)return;
 if(authError||!user){currentUser=null;claim.disabled=true;claim.textContent='Log in to claim';status.replaceChildren();status.append('Please ');const a=document.createElement('a');a.href='login.html';a.textContent='log in';status.append(a,' to see your Cartoon Coins.');balance.textContent='—';row('Sign in to see transactions.');return}
 currentUser=user.id;
 const [wallet,transactions,dailyClaim]=await Promise.all([
  client.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle(),
  client.from('coin_transactions').select('id,amount,reason,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30),
  client.from('coin_daily_claims').select('reward_date').eq('user_id',user.id).eq('reward_date',new Date().toISOString().slice(0,10)).maybeSingle()
 ]);
 if(sequence!==refreshSequence)return;
 if(wallet.error){status.textContent='Unable to load your wallet. Please try again.';balance.textContent='—'}
 else{balance.textContent=number(wallet.data?.balance??0);status.textContent='Wallet ready.'}
 if(wallet.error||!wallet.data||transactions.error||dailyClaim.error){row(transactions.error?'Unable to load transactions.':wallet.error||!wallet.data?'Wallet unavailable.':'Reward status unavailable.');claim.disabled=true;claim.textContent='Reward unavailable';return}
 history.replaceChildren();
 if(!transactions.data?.length)row('No transactions yet.');
 for(const item of transactions.data||[]){
  const tr=document.createElement('tr');
  const date=document.createElement('td');date.textContent=new Date(item.created_at).toLocaleString();
  const reason=document.createElement('td');reason.textContent=item.reason==='daily_reward'?'🎁 Daily reward':item.reason.replaceAll('_',' ');
  const amount=document.createElement('td');amount.textContent=(Number(item.amount)>0?'+':'')+number(item.amount);
  amount.className=Number(item.amount)>=0?'coin-positive':'coin-negative';
  tr.append(date,reason,amount);history.append(tr);
 }
 const already=Boolean(dailyClaim.data)||Boolean(transactions.data?.some(item=>item.reason==='daily_reward'&&item.created_at?.slice(0,10)===new Date().toISOString().slice(0,10)));
 // The daily-claim table is authoritative even when recent history is truncated.
 claim.disabled=Boolean(already)||claimPending;claim.textContent=already?'Already claimed today':claimPending?'Claiming…':'Claim 25 Coins';
 next.textContent='Next reset: '+nextUtc();
}
claim.addEventListener('click',async()=>{
 if(!currentUser||claimPending||claim.disabled)return;
 const userAtStart=currentUser;
 claimPending=true;
 claim.disabled=true;claim.textContent='Claiming…';
 let feedback='';
 try{
  const {data,error}=await client.rpc('claim_daily_cartoon_coins');
  feedback=error?'Reward unavailable. Please try again.':data?.claimed?'You earned 25 Cartoon Coins!':'You already claimed today. Come back after the UTC reset.';
 }catch{
  feedback='Unable to reach the reward service. Please try again.';
 }finally{
  claimPending=false;
  await refresh();
  if(currentUser===userAtStart)status.textContent=feedback;
 }
});
client.auth.onAuthStateChange(()=>setTimeout(refresh,0));
refresh();
