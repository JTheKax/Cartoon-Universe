// Browser-side owner verification also keeps the normal Supabase session on this
// origin, so the verified owner's dashboard can use its existing RLS-protected APIs.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_KEY} from '/__maintenance/owner-verification-config.js';
const client=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const form=document.getElementById('verify-form'),status=document.getElementById('status'),clear=document.getElementById('clear'),verify=document.getElementById('verify');
const password=document.getElementById('password');
let initializing=true,inFlight=false;
function busy(value){verify.disabled=value||initializing;clear.disabled=value||initializing;}
function show(verified){if(verified)password.value='';form.hidden=verified;clear.hidden=!verified;document.getElementById('arcade-entry').hidden=!verified;status.textContent=verified?'Owner sign-in verified. Open the arcade and Owner Dashboard.':'Use your existing owner account.';}
async function refresh(){
 const response=await fetch('/__maintenance/owner-status',{credentials:'same-origin',cache:'no-store',redirect:'error'});
 if(!response.ok)throw new Error('Verification status unavailable.');show((await response.json()).ownerVerified===true);
}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(initializing||inFlight)return;
 inFlight=true;busy(true);
 try{
  const identifier=document.getElementById('identifier').value.trim(),secret=password.value;
  if(!identifier.includes('@')&&!/^[A-Za-z0-9_]{3,20}$/.test(identifier))throw new Error('Enter a valid username or email.');
  let session;
  if(identifier.includes('@')){
   const {data,error}=await client.auth.signInWithPassword({email:identifier,password:secret});
   if(error||!data?.session)throw new Error('Sign-in failed. Check your email and password.');
   session=data.session;
  }else{
   const response=await fetch(SUPABASE_URL+'/functions/v1/username-login',{
    method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},credentials:'omit',redirect:'error',cache:'no-store',
    body:JSON.stringify({username:identifier,password:secret})
   });
   if(!response.ok)throw new Error('Sign-in failed. Check your username and password.');
   const tokens=await response.json();
   if(typeof tokens.access_token!=='string'||typeof tokens.refresh_token!=='string')throw new Error('Sign-in could not be verified.');
   const {data,error}=await client.auth.setSession({access_token:tokens.access_token,refresh_token:tokens.refresh_token});
   if(error||!data?.session)throw new Error('Sign-in could not be verified.');
   session=data.session;
  }
  const verified=await fetch('/__maintenance/verify-session',{method:'POST',headers:{Authorization:'Bearer '+session.access_token},credentials:'same-origin',redirect:'error',cache:'no-store'});
  if(!verified.ok){await client.auth.signOut({scope:'local'});throw new Error('Owner access could not be verified.');}
  clear.hidden=false;await refresh();
 }catch(error){status.textContent=error.message||'Verification unavailable. Try again.';}
 finally{password.value='';inFlight=false;busy(false);}
});
clear.addEventListener('click',async()=>{
 if(initializing||inFlight)return;
 inFlight=true;busy(true);
 try{
  // Clear the normal browser session as well as the protected gateway cookie.
  // The gateway DELETE is still attempted if Supabase sign-out fails.
  try{await client.auth.signOut({scope:'local'});}catch{}
  const response=await fetch('/__maintenance/verify-session',{method:'DELETE',credentials:'same-origin',redirect:'error',cache:'no-store'});
  if(!response.ok)throw new Error('Unable to clear verification. Try again.');
  show(false);status.textContent='Verification session cleared.';
 }catch(error){status.textContent=error.message;}
 finally{password.value='';inFlight=false;busy(false);}
});
busy(true);
refresh().catch(()=>{status.textContent='Verification status unavailable. Try again shortly.';}).finally(()=>{initializing=false;busy(false);});
