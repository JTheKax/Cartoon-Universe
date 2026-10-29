import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const style=document.createElement('style');
style.textContent=`#cu-chat-toggle{position:fixed;right:18px;bottom:18px;z-index:9000;border:2px solid #6df7eb;background:#21123e;color:white;border-radius:25px;padding:12px 18px;cursor:pointer;box-shadow:0 0 18px #8d48f777;font-weight:800}#cu-chat-panel{position:fixed;right:18px;bottom:76px;width:min(355px,calc(100vw - 36px));height:min(490px,calc(100dvh - 110px));z-index:9000;background:#180e2d;color:#f9f4ff;border:2px solid #6df7eb;border-radius:16px;box-shadow:0 12px 40px #000b;display:flex;flex-direction:column;font-family:system-ui,sans-serif}#cu-chat-panel[hidden]{display:none}#cu-chat-panel header{position:static!important;display:flex;justify-content:space-between;align-items:center;padding:12px;background:#302057;border-radius:14px 14px 0 0}#cu-chat-panel header button{background:transparent;border:0;color:white;font-size:22px;cursor:pointer}#cu-chat-messages{overflow-y:auto;flex:1;padding:12px;font-size:13px}#cu-chat-messages p{margin:0 0 11px;overflow-wrap:anywhere}#cu-chat-messages strong{color:#83f9ee}#cu-chat-messages time{color:#b8abc9;font-size:11px;margin-left:6px}#cu-chat-form{display:flex;gap:6px;padding:10px;border-top:1px solid #574575}#cu-chat-form input{flex:1;min-width:0;border-radius:8px;padding:10px;background:#291d40;color:white;border:1px solid #75629b}#cu-chat-form button{border:0;border-radius:8px;background:#72e8df;color:#160d2b;font-weight:800;padding:8px;cursor:pointer}#cu-chat-status{font-size:12px;margin:0;padding:0 12px 10px;color:#e8d5fa}`;
document.head.append(style);
const toggle=document.createElement('button');toggle.id='cu-chat-toggle';toggle.type='button';toggle.textContent='💬 Global Chat';toggle.setAttribute('aria-expanded','false');
const panel=document.createElement('section');panel.id='cu-chat-panel';panel.hidden=true;panel.setAttribute('aria-label','Cartoon Universe Global Chat');
panel.innerHTML='<header><strong>🌐 Cartoon Universe Chat</strong><button type="button" aria-label="Close chat">×</button></header><div id="cu-chat-messages" role="log" aria-live="polite"></div><form id="cu-chat-form"><input maxlength="500" required placeholder="Message the arcade…" aria-label="Chat message"><button type="submit">Send</button></form><p id="cu-chat-status">Sign in to chat.</p>';
document.body.append(toggle,panel);
const messages=panel.querySelector('#cu-chat-messages'),status=panel.querySelector('#cu-chat-status'),form=panel.querySelector('form'),input=form.querySelector('input');
let open=false,busy=false;const names=new Map();
async function refresh(){
 if(!open||busy)return;busy=true;
 try{
  const {data:{user}}=await db.auth.getUser();
  input.disabled=!user;form.querySelector('button').disabled=!user;
  status.textContent=user?'Be kind. Messages are visible to signed-in players.':'Sign in to your Player Account to read and send messages.';
  if(!user){messages.replaceChildren();return;}
  const {data,error}=await db.from('global_chat_messages').select('id,user_id,body,created_at').order('created_at',{ascending:false}).limit(60);
  if(error){status.textContent='Chat unavailable: '+error.message;return;}
  const ids=[...new Set((data||[]).map(m=>m.user_id))].filter(id=>!names.has(id));
  if(ids.length){const result=await db.from('profiles').select('id,username').in('id',ids);for(const p of result.data||[])names.set(p.id,p.username||'Player');}
  const frag=document.createDocumentFragment();
  for(const m of (data||[]).reverse()){const p=document.createElement('p'),strong=document.createElement('strong'),time=document.createElement('time'),body=document.createElement('span');strong.textContent=names.get(m.user_id)||'Player';time.textContent=new Date(m.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});body.textContent=' '+m.body;p.append(strong,time,document.createElement('br'),body);frag.append(p);}
  const atBottom=messages.scrollTop+messages.clientHeight>=messages.scrollHeight-45;
  messages.replaceChildren(frag);if(atBottom)messages.scrollTop=messages.scrollHeight;
 }catch{status.textContent='Chat temporarily unavailable.';}finally{busy=false;}
}
function setOpen(value){open=value;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)refresh();}
toggle.addEventListener('click',()=>setOpen(!open));panel.querySelector('header button').addEventListener('click',()=>setOpen(false));
form.addEventListener('submit',async e=>{e.preventDefault();const body=input.value.trim();if(!body)return;const {data:{user}}=await db.auth.getUser();if(!user){status.textContent='Please sign in first.';return;}const button=form.querySelector('button');button.disabled=true;const {error}=await db.from('global_chat_messages').insert({user_id:user.id,body});button.disabled=false;if(error){status.textContent='Not sent: '+error.message;return;}input.value='';await refresh();});
setInterval(()=>{if(open)refresh();},7000);
db.auth.onAuthStateChange(()=>{if(open)setTimeout(refresh,0);});
