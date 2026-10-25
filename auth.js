import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const $=id=>document.getElementById(id);
const notice=$('notice'),authForms=$('auth-forms'),account=$('account-panel');
const configured=SUPABASE_URL.startsWith('https://')&&SUPABASE_ANON_KEY.length>30;
let client=null;
function message(text){notice.textContent=text;notice.hidden=!text}
function show(form){document.querySelectorAll('[data-form]').forEach(el=>el.hidden=el.dataset.form!==form);const actions=$('login-actions');if(actions)actions.hidden=form!=='login';const back=$('reset-actions');if(back)back.hidden=form!=='forgot';message('')}
function errorText(e){return e?.message||'Something went wrong. Try again.'}
if(!configured){message('Accounts are not connected yet. The owner must configure a new Supabase project before signup is enabled.');document.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=true)}
else{
 client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
 const params=new URLSearchParams(location.search);
 if(params.get('type')==='recovery'){show('password-update')}
 else {show(location.pathname.endsWith('/register.html')?'signup':'login')}
 async function render(){
  const {data:{user}}=await client.auth.getUser();
  if(params.get('type')==='recovery'){authForms.hidden=false;account.hidden=true;show('password-update');return}
  authForms.hidden=!!user;account.hidden=!user;
  if(!user)return;
  const [{data:profile},{data:owner}]=await Promise.all([
   client.from('profiles').select('username,display_name,avatar_color').eq('id',user.id).maybeSingle(),
   client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle()
  ]);
  $('account-email').textContent=user.email||'';
  $('account-role').textContent=owner?'Owner':'Player';

  $('account-username').textContent=profile?.username||'new-player';
  $('profile-display-heading').textContent=profile?.display_name||profile?.username||'Your Profile';
  const avatar=$('profile-avatar-preview');avatar.style.backgroundColor=profile?.avatar_color||'#ff4ca8';avatar.textContent=(profile?.display_name||profile?.username||'CU').trim().slice(0,2).toUpperCase();
  $('profile-name').value=profile?.display_name||'';
  $('profile-color').value=profile?.avatar_color||'#ff4ca8';
  $('profile-username').value=profile?.username||'';
 }
 client.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){params.set('type','recovery');authForms.hidden=false;account.hidden=true;show('password-update');return}setTimeout(()=>render().catch(e=>message(errorText(e))),0)});
 render().catch(e=>message(errorText(e)));
 $('signup').addEventListener('submit',async e=>{
  e.preventDefault();message('');
  const username=$('signup-username').value.trim(),email=$('signup-email').value.trim(),password=$('signup-password').value;
  if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){message('Username must be 3–20 letters, numbers or underscores.');return}
  if(password.length<8){message('Use a password of at least 8 characters.');return}
  const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/login.html',data:{username}}});
  if(error){message(errorText(error));return}
  if(data.user&&data.session){
   const {error:profileError}=await client.from('profiles').insert({id:data.user.id,username,display_name:username});
   message(profileError?'Account created, but username could not be saved. Try updating your profile.':'Account created!');
   await render();
  }else{
   message('Check your email to confirm your account. After confirmation, sign in and choose your username in your profile.');
  }
 });
 $('login').addEventListener('submit',async e=>{
 e.preventDefault();message('');
 const identifier=$('login-email').value.trim(),password=$('login-password').value;
 if(!identifier||!password){message('Enter your username or email and password.');return}
 if(identifier.includes('@')){
  const {error}=await client.auth.signInWithPassword({email:identifier,password});
  message(error?'Invalid username/email or password.':'Signed in!');
  if(!error)await render();
  return;
 }
 if(!/^[A-Za-z0-9_]{3,20}$/.test(identifier)){message('Invalid username/email or password.');return}
 try{
  const response=await fetch(SUPABASE_URL+'/functions/v1/username-login',{
   method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY},
   body:JSON.stringify({username:identifier,password})
  });
  const result=await response.json();
  if(!response.ok||!result.access_token||!result.refresh_token){message('Invalid username/email or password.');return}
  const {error}=await client.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});
  message(error?'Unable to sign in. Try again.':'Signed in!');
  if(!error)await render();
 }catch{message('Login is temporarily unavailable. Try again shortly.')}
});
 $('forgot').addEventListener('submit',async e=>{e.preventDefault();const {error}=await client.auth.resetPasswordForEmail($('forgot-email').value.trim(),{redirectTo:location.origin+'/login.html'});message(error?errorText(error):'If the address is registered, a reset email will arrive.')});
 $('password-update').addEventListener('submit',async e=>{e.preventDefault();const password=$('new-password').value;if(password.length<8){message('Use at least 8 characters.');return}const {data:{session}}=await client.auth.getSession();if(!session){message('Recovery link is invalid or expired. Request a new password reset email.');return}const {error}=await client.auth.updateUser({password});message(error?errorText(error):'Password updated.');if(!error){params.delete('type');history.replaceState(null,'','/login.html');authForms.hidden=false;account.hidden=true;show('login');message('Password updated. You can now sign in.')}});
 $('profile').addEventListener('submit',async e=>{e.preventDefault();const {data:{user}}=await client.auth.getUser();if(!user)return;const username=$('profile-username').value.trim();if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){message('Username must be 3–20 letters, numbers or underscores.');return}const {error}=await client.from('profiles').upsert({id:user.id,username,display_name:$('profile-name').value.trim().slice(0,40),avatar_color:$('profile-color').value},{onConflict:'id'});message(error?errorText(error):'Profile saved!');if(!error)await render()});
 $('logout').addEventListener('click',async()=>{const {error}=await client.auth.signOut();message(error?errorText(error):'Signed out.');if(!error)await render()});
}
document.querySelectorAll('[data-show]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.show)));

// Local avatar preview; changes are only persisted after Save profile.
const preview=()=>{const a=$('profile-avatar-preview');if(!a)return;a.style.backgroundColor=$('profile-color').value;a.textContent=($('profile-name').value.trim()||$('profile-username').value.trim()||'CU').slice(0,2).toUpperCase()};
['profile-color','profile-name','profile-username'].forEach(id=>$(id)?.addEventListener('input',preview));
