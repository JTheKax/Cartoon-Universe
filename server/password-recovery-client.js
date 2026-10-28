// Maintenance-safe password recovery. No wallet, owner-role, or maintenance writes.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_KEY} from '/__maintenance/owner-verification-config.js';
const client=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{detectSessionInUrl:false,persistSession:false,autoRefreshToken:false}});
const status=document.querySelector('#recovery-status');
const requestForm=document.querySelector('#recovery-request-form');
const email=document.querySelector('#recovery-email');
const form=document.querySelector('#recovery-form');
const password=document.querySelector('#password-new');
const confirm=document.querySelector('#password-confirm');
const scrub=()=>history.replaceState(null,'',location.pathname);
const fail=()=>{status.textContent='This recovery link is invalid or expired. Request a fresh password recovery email below.';};

// The reset link always returns to this protected-gateway recovery route.
// Supabase Auth must explicitly allowlist this URL before release.
requestForm.addEventListener('submit',async event=>{
 event.preventDefault();
 const address=email.value.trim();
 if(!address)return;
 const button=requestForm.querySelector('button');button.disabled=true;
 try{
  const redirectTo=location.origin+'/__maintenance/password-recovery';
  const {error}=await client.auth.resetPasswordForEmail(address,{redirectTo});
  status.textContent=error?'Unable to request a reset email. Please try again later.':'If this email belongs to an account, a password reset link will arrive shortly.';
 }catch{status.textContent='Unable to request a reset email. Please try again later.';}
 finally{email.value='';button.disabled=false;}
});

try{
 const query=new URLSearchParams(location.search);
 const fragment=new URLSearchParams(location.hash.slice(1));
 // Strip credentials from browser history immediately; never log them.
 scrub();
 const hasToken=query.has('token_hash')||query.has('code')||fragment.has('access_token')||query.has('error')||fragment.has('error');
 if(!hasToken){status.textContent='Enter your account email to request a password reset link.';}
 else{
  try{
   let error=null;
   if(query.has('error')||fragment.has('error'))throw new Error('Recovery link rejected');
   if(query.get('token_hash')&&query.get('type')==='recovery'){
    const result=await client.auth.verifyOtp({token_hash:query.get('token_hash'),type:'recovery'});
    error=result.error;
   }else if(query.get('code')){
    const result=await client.auth.exchangeCodeForSession(query.get('code'));
    error=result.error;
   }else if(fragment.get('access_token')&&fragment.get('refresh_token')&&fragment.get('type')==='recovery'){
    const result=await client.auth.setSession({access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token')});
    error=result.error;
   }else throw new Error('No recovery token');
   if(error)throw error;
   const {data:{session}}=await client.auth.getSession();
   if(!session)throw new Error('No recovery session');
   status.textContent='Recovery verified. Choose a new password (at least 12 characters).';
   requestForm.hidden=true;form.hidden=false;
   form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(password.value.length<12||password.value!==confirm.value){status.textContent='Passwords must match and be at least 12 characters.';return;}
    const button=form.querySelector('button');button.disabled=true;
    const result=await client.auth.updateUser({password:password.value});
    password.value='';confirm.value='';
    if(result.error){status.textContent='Password update failed. Try again or request a new recovery email.';button.disabled=false;return;}
    form.hidden=true;
    await client.auth.signOut({scope:'local'});
    status.textContent='Password updated. Return to Owner Login and sign in with your new password.';
   });
  }catch{fail();}
 }
}catch{fail();}
