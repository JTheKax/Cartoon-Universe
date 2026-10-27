// Owner-session diagnostics only. No profile, wallet, or maintenance operation.
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {productionSiteOrigin} from './production-maintenance-gateway.mjs';
const PROJECT='https://gjfyemvcrgrthbrlqqnz.supabase.co';
const COOKIE='__Host-cu_owner_verify';
const TTL=300000;
const HTML='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartoon Universe Owner Verification</title><link rel="stylesheet" href="/__maintenance/owner-verification.css"></head><body><main><p class="eyebrow">CARTOON UNIVERSE · OWNER CHECK</p><h1>Verify owner sign-in</h1><p>This page checks owner access only. It cannot change your profile, coins, or maintenance settings.</p><form id="verify-form"><label for="identifier">Username or email</label><input id="identifier" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="254" required><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" maxlength="1024" required><button id="verify" type="submit">Verify owner sign-in</button></form><p id="status" role="status" aria-live="polite">Use your existing owner account.</p><button id="clear" type="button" hidden>Clear verification session</button><p id="arcade-entry" hidden><a href="/__maintenance/arcade/">Enter owner arcade</a></p><p class="note">Your password goes directly to Supabase. No password or refresh token is stored by this verification server.</p></main><script type="module" src="/__maintenance/owner-verification.js"></script></body></html>';
const CSS=':root{color-scheme:dark;--cyan:#66f5ff;--yellow:#ffdc69;--pink:#ff6dc5}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;color:#f6f3ff;font:16px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;background:linear-gradient(#0a0920b8,#0a0920c9),url('/__maintenance/arcade-error-background.png') center/cover fixed,radial-gradient(ellipse at top,#30205f,#0a0920 70%)}main{max-width:560px;margin:5vh auto;padding:clamp(24px,5vw,40px);border:4px solid var(--cyan);background:#171439;box-shadow:0 0 0 7px #0a0920,0 0 0 11px #7256d3,10px 10px 0 #050414}h1{color:var(--cyan);font-size:clamp(25px,5vw,38px);line-height:1.2;text-transform:uppercase;text-shadow:3px 3px 0 #62388c}.eyebrow{font-size:12px;letter-spacing:.16em;color:var(--pink)}.note{font-size:12px;color:#bcb3e1}p{line-height:1.6}label{display:block;margin:18px 0 7px;font-weight:700;color:var(--yellow)}input,button{width:100%;font:inherit;border-radius:0;padding:12px;border:2px solid #8a6dad}input{background:#0a0920;color:#fff}button{margin-top:20px;background:var(--cyan);color:#15122b;font-weight:800;box-shadow:4px 4px 0 #0b091a;cursor:pointer}button:hover{background:#a6fbff}button:disabled{opacity:.6;cursor:wait}a{color:var(--yellow)}:focus-visible{outline:3px solid var(--yellow);outline-offset:3px}#status{min-height:3em}@media(max-width:480px){body{padding:16px}main{box-shadow:0 0 0 4px #0a0920,0 0 0 7px #7256d3;padding:24px 18px}}';
export function createOwnerVerification({origin,supabaseUrl,publishableKey,fetchImpl=fetch,now=Date.now,onVerified=()=>{}}){
 const siteOrigin=productionSiteOrigin(origin);
 if(supabaseUrl!==PROJECT||typeof publishableKey!=='string'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)||publishableKey.length<=30)throw new Error('Explicit owner-verification origin, project, and publishable key are required.');
 const script=readFileSync(new URL('./owner-verification-client.js',import.meta.url));
 const sessions=new Map();
 const cookie=(id,age)=>`${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}; Secure`;
 const csp=`default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' ${PROJECT}; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`;
 async function api(path,token,method='GET'){
  const response=await fetchImpl(PROJECT+path,{method,headers:{apikey:publishableKey,Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Owner verification unavailable');
  return response;
 }
 async function owner(token){
  if(!token)return false;
  try{
   const user=await (await api('/auth/v1/user',token)).json();
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id||'')||user.is_anonymous===true)return false;
   const rows=await (await api('/rest/v1/owner_members?select=user_id&user_id=eq.'+encodeURIComponent(user.id),token)).json();
   return Array.isArray(rows)&&rows.some(row=>row.user_id===user.id);
  }catch{return false;}
 }
 const authorized=async req=>{
  const id=(req.headers.cookie||'').split(';').map(value=>value.trim()).find(value=>value.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const session=sessions.get(id);
  const valid=!!session&&session.expires>now()&&await owner(session.token);
  if(!valid)sessions.delete(id);
  return valid;
 };
 const handle=async(req,send)=>{
  const path=req.url.split('?')[0];
  const known=['/__maintenance/owner-signin','/__maintenance/owner-verification.js','/__maintenance/owner-verification.css','/__maintenance/owner-verification-config.js','/__maintenance/verify-session','/__maintenance/owner-status'];
  if(!known.includes(path))return false;
  const done=(code,body,type='text/plain; charset=utf-8',extra={})=>{send(code,body,type,{'Content-Security-Policy':csp,...extra});return true;};
  const json=(code,data,extra={})=>done(code,JSON.stringify(data),'application/json; charset=utf-8',extra);
  const id=(req.headers.cookie||'').split(';').map(value=>value.trim()).find(value=>value.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(path==='/__maintenance/verify-session'){
   if(!['POST','DELETE'].includes(req.method))return done(405,'Method not allowed',undefined,{Allow:'POST, DELETE'});
   if(req.headers.origin!==siteOrigin)return done(403,'Same-origin request required');
   if(Number(req.headers['content-length']||0)>0||req.headers['transfer-encoding'])return done(400,'This endpoint accepts an access-token header only.');
   if(req.method==='DELETE'){
    const session=sessions.get(id);sessions.delete(id);let signedOut=true;
    if(session)try{await api('/auth/v1/logout?scope=local',session.token,'POST');}catch{signedOut=false;}
    return json(200,{cleared:true,signOutConfirmed:signedOut},{'Set-Cookie':cookie('',0)});
   }
   const auth=req.headers.authorization||'';
   const token=auth.startsWith('Bearer ')?auth.slice(7):null;
   if(auth.length>8192||!await owner(token)){sessions.delete(id);return json(403,{ownerVerified:false},{'Set-Cookie':cookie('',0)});}
   for(const [key,session] of sessions)if(session.expires<=now())sessions.delete(key);
   if(sessions.size>=1000)return done(503,'Verification session capacity reached');
   const previous=sessions.get(id);
   sessions.delete(id);
   if(previous&&previous.token!==token)try{await api('/auth/v1/logout?scope=local',previous.token,'POST');}catch{}
   const nonce=randomBytes(32).toString('hex');sessions.set(nonce,{token,expires:now()+TTL});
   onVerified();return json(200,{ownerVerified:true,readOnly:true},{'Set-Cookie':cookie(nonce,TTL/1000)});
  }
  if(!['GET','HEAD'].includes(req.method))return done(405,'Method not allowed',undefined,{Allow:'GET, HEAD'});
  if(path==='/__maintenance/owner-status'){
   const session=sessions.get(id);
   const valid=!!session&&session.expires>now()&&await owner(session.token);
   if(!valid)sessions.delete(id);
   return json(200,{ownerVerified:valid,readOnly:true});
  }
  if(path==='/__maintenance/owner-signin')return done(200,HTML,'text/html; charset=utf-8');
  if(path==='/__maintenance/owner-verification.css')return done(200,CSS,'text/css; charset=utf-8');
  if(path==='/__maintenance/owner-verification.js')return done(200,script,'text/javascript; charset=utf-8');
  return done(200,`export const SUPABASE_URL=${JSON.stringify(PROJECT)};
export const SUPABASE_KEY=${JSON.stringify(publishableKey)};
`,'text/javascript; charset=utf-8');
 };
 handle.authorized=authorized;
 return handle;
}
