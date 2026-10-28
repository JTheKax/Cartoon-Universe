// Browser-side owner verification also keeps the normal Supabase session on this
// origin, so the verified owner's dashboard can use its existing RLS-protected APIs.
import {SUPABASE_URL,SUPABASE_KEY} from '/__maintenance/owner-verification-config.js';
let client;
async function getClient(){
 if(!client){
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  client=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 }
 return client;
}
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
 inFlight=true;busy(true);let signedInThisAttempt=false;
 try{
  const identifier=document.getElementById('identifier').value.trim(),secret=password.value;
  if(!identifier.includes('@')&&!/^[A-Za-z0-9_]{3,20}$/.test(identifier))throw new Error('Enter a valid username or email.');
  const client=await getClient();
  let session;
  if(identifier.includes('@')){
   const {data,error}=await client.auth.signInWithPassword({email:identifier,password:secret});
   if(error||!data?.session)throw new Error('Sign-in failed. Check your email and password.');
   session=data.session;signedInThisAttempt=true;
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
   session=data.session;signedInThisAttempt=true;
  }
  const verified=await fetch('/__maintenance/verify-session',{method:'POST',headers:{Authorization:'Bearer '+session.access_token},credentials:'same-origin',redirect:'error',cache:'no-store'});
  if(!verified.ok)throw new Error('Owner access could not be verified.');
  signedInThisAttempt=false;clear.hidden=false;await refresh();
 }catch(error){if(signedInThisAttempt&&client)try{await client.auth.signOut({scope:'local'});}catch{}status.textContent=error.message||'Verification unavailable. Try again.';}
 finally{password.value='';inFlight=false;busy(false);}
});
clear.addEventListener('click',async()=>{
 if(initializing||inFlight)return;
 inFlight=true;busy(true);
 try{
  // Clear the server-side owner cookie before the browser session. A local
  // Supabase sign-out does not invalidate a still-authorized gateway cookie.
  const response=await fetch('/__maintenance/verify-session',{method:'DELETE',credentials:'same-origin',redirect:'error',cache:'no-store'});
  if(!response.ok)throw new Error('Unable to clear verification. Try again.');
  show(false);
  try{
   const activeClient=client||await getClient();
   const {error}=await activeClient.auth.signOut({scope:'local'});
   if(error)throw error;
   status.textContent='Verification session cleared.';
  }catch{status.textContent='Owner gateway access cleared, but browser sign-out could not be confirmed. Try again.';}
 }catch(error){status.textContent=error.message;}
 finally{password.value='';inFlight=false;busy(false);}
});
busy(true);
refresh().catch(()=>{status.textContent='Verification status unavailable. Try again shortly.';}).finally(()=>{initializing=false;busy(false);});
