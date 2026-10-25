import {SUPABASE_URL,SUPABASE_KEY} from '/__maintenance/owner-verification-config.js';
const form=document.getElementById('verify-form'),status=document.getElementById('status'),clear=document.getElementById('clear'),verify=document.getElementById('verify');
const password=document.getElementById('password');
let initializing=true,inFlight=false;
function busy(value){verify.disabled=value||initializing;clear.disabled=value||initializing;}
function show(verified){if(verified)password.value='';form.hidden=verified;clear.hidden=!verified;status.textContent=verified?'Owner sign-in verified. No arcade settings have changed.':'Use your existing owner account.';}
async function revoke(token){
 try{await fetch(SUPABASE_URL+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token},credentials:'omit',redirect:'error',cache:'no-store'});}catch{}
}
async function refresh(){
 const response=await fetch('/__maintenance/owner-status',{credentials:'same-origin',cache:'no-store',redirect:'error'});
 if(!response.ok)throw new Error('Verification status unavailable.');show((await response.json()).ownerVerified===true);
}
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(initializing||inFlight)return;
 inFlight=true;busy(true);let token;
 try{
  const identifier=document.getElementById('identifier').value.trim(),secret=password.value;
  if(!identifier.includes('@')&&!/^[A-Za-z0-9_]{3,20}$/.test(identifier))throw new Error('Enter a valid username or email.');
  const email=identifier.includes('@');
  const response=await fetch(SUPABASE_URL+(email?'/auth/v1/token?grant_type=password':'/functions/v1/username-login'),{
   method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},credentials:'omit',redirect:'error',cache:'no-store',
   body:JSON.stringify(email?{email:identifier,password:secret}:{username:identifier,password:secret})
  });
  if(!response.ok)throw new Error('Sign-in failed. Check your username/email and password.');
  token=(await response.json()).access_token;
  if(typeof token!=='string')throw new Error('Sign-in could not be verified.');
  const verified=await fetch('/__maintenance/verify-session',{method:'POST',headers:{Authorization:'Bearer '+token},credentials:'same-origin',redirect:'error',cache:'no-store'});
  if(!verified.ok){await revoke(token);token=null;throw new Error('Owner access could not be verified.');}
  clear.hidden=false;await refresh();
 }catch(error){status.textContent=error.message||'Verification unavailable. Try again.';}
 finally{password.value='';inFlight=false;busy(false);}
});
clear.addEventListener('click',async()=>{
 if(initializing||inFlight)return;
 inFlight=true;busy(true);
 try{
  const response=await fetch('/__maintenance/verify-session',{method:'DELETE',credentials:'same-origin',redirect:'error',cache:'no-store'});
  if(!response.ok)throw new Error('Unable to clear verification. Try again.');
  const result=await response.json();form.hidden=false;clear.hidden=true;status.textContent=result.signOutConfirmed?'Verification session cleared.':'Verification cleared. Auth sign-out could not be confirmed.';
 }catch(error){status.textContent=error.message;}
 finally{password.value='';inFlight=false;busy(false);}
});
busy(true);
refresh().catch(()=>{status.textContent='Verification status unavailable. Try again shortly.';}).finally(()=>{initializing=false;busy(false);});
