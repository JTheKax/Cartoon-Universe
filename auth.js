import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
const $=id=>document.getElementById(id);
const notice=$('notice'),authForms=$('auth-forms'),account=$('account-panel');
const configured=SUPABASE_URL.startsWith('https://')&&SUPABASE_ANON_KEY.length>30;
let client=null;
function message(text){notice.textContent=text;notice.hidden=!text}
function show(form){document.querySelectorAll('[data-form]').forEach(el=>el.hidden=el.dataset.form!==form);const actions=$('login-actions');if(actions)actions.hidden=form!=='login';message('')}
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

  $('account-username').textContent=profile?.username||'Profile not created yet';
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
  if(password.length<12){message('Use a password of at least 12 characters.');return}
  const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/login.html'}});
  if(error){message(errorText(error));return}
  if(data.user&&data.session){
   const {error:profileError}=await client.from('profiles').insert({id:data.user.id,username,display_name:username});
   message(profileError?'Account created, but username could not be saved. Try updating your profile.':'Account created!');
   await render();
  }else{
   message('Check your email to confirm your account. After confirmation, sign in and choose your username in your profile.');
  }
 });
 $('login').addEventListener('submit',async e=>{e.preventDefault();const {error}=await client.auth.signInWithPassword({email:$('login-email').value.trim(),password:$('login-password').value});message(error?errorText(error):'Signed in!');if(!error)await render()});
 $('forgot').addEventListener('submit',async e=>{e.preventDefault();const {error}=await client.auth.resetPasswordForEmail($('forgot-email').value.trim(),{redirectTo:location.origin+'/login.html'});message(error?errorText(error):'If the address is registered, a reset email will arrive.')});
 $('password-update').addEventListener('submit',async e=>{e.preventDefault();const password=$('new-password').value;if(password.length<12){message('Use at least 12 characters.');return}const {error}=await client.auth.updateUser({password});message(error?errorText(error):'Password updated.');if(!error){params.delete('type');history.replaceState(null,'','/login.html');authForms.hidden=false;account.hidden=true;show('login');message('Password updated. You can now sign in.')}});
 $('profile').addEventListener('submit',async e=>{e.preventDefault();const {data:{user}}=await client.auth.getUser();if(!user)return;const username=$('profile-username').value.trim();if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){message('Username must be 3–20 letters, numbers or underscores.');return}const {error}=await client.from('profiles').upsert({id:user.id,username,display_name:$('profile-name').value.trim().slice(0,40),avatar_color:$('profile-color').value},{onConflict:'id'});message(error?errorText(error):'Profile saved!');if(!error)await render()});
 $('logout').addEventListener('click',async()=>{const {error}=await client.auth.signOut();message(error?errorText(error):'Signed out.');if(!error)await render()});
}
document.querySelectorAll('[data-show]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.show)));
