// STAGING ONLY. No production deployment or database writes are performed here.
import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';

const PRODUCTION_REF='gjfyemvcrgrthbrlqqnz';
const COOKIE='cu_staging_owner';
const TTL=5*60*1000;
const PUBLIC=new Set(['/login.html','/auth.js','/styles.css','/account.css','/theme.js','/config.js','/__maintenance/bridge.js']);
const FILES=new Set(['index.html','login.html','register.html','account.html','coin-wallet.html','owner.html','styles.css','account.css','owner.css','script.js','auth.js','theme.js','admin-nav.js','home-profile.js','coin-wallet.js','owner.js','maintenance-preview.js','maintenance-controls.js','maintenance-notice.js','static/cartoon-carnival.png','static/haunted-arcade.gif']);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.gif':'image/gif'};
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function stagingConfig(env){
 const url=new URL(env.STAGING_SUPABASE_URL);
 if(url.protocol!=='https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)
    || url.hostname===PRODUCTION_REF+'.supabase.co' || url.origin!==url.href.replace(/\/$/,''))
  throw new Error('A separate staging Supabase project URL is required. Production is forbidden.');
 const key=env.STAGING_SUPABASE_PUBLISHABLE_KEY;
 if(!key?.startsWith('sb_publishable_'))throw new Error('A staging publishable key is required; secret/service-role keys are forbidden.');
 const site=new URL(env.STAGING_SITE_ORIGIN);
 if(site.username||site.password||site.origin!==site.href.replace(/\/$/,''))throw new Error('Use a site origin without path, credentials, query, or fragment.');
 if(site.protocol!=='https:' && !(site.protocol==='http:' && ['localhost','127.0.0.1'].includes(site.hostname)))
  throw new Error('HTTPS is required outside localhost.');
 return {supabaseUrl:url.origin,key,siteOrigin:site.origin,secure:site.protocol==='https:'};
}

export function createGateway({config,root=resolve(fileURLToPath(new URL('..',import.meta.url))),fetchImpl=fetch,now=Date.now}){
 const sessions=new Map();
 async function api(path,token){
  const response=await fetchImpl(config.supabaseUrl+path,{
   headers:{apikey:config.key,...(token?{Authorization:'Bearer '+token}:{})},
   signal:AbortSignal.timeout(3000),redirect:'error'
  });
  if(!response.ok)throw new Error('Staging verification unavailable');
  return response.json();
 }
 async function owner(token){
  if(!token)return false;
  try{
   const user=await api('/auth/v1/user',token);
   if(!/^[0-9a-f-]{36}$/i.test(user.id||'')||user.is_anonymous===true)return false;
   const rows=await api('/rest/v1/owner_members?select=user_id&user_id=eq.'+encodeURIComponent(user.id),token);
   return Array.isArray(rows)&&rows.some(row=>row.user_id===user.id);
  }catch{return false;}
 }
 const cookie=(id,maxAge)=>`${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.secure?'; Secure':''}`;
 return createServer(async(req,res)=>{
  const send=(code,body,type='text/plain; charset=utf-8',extra={})=>{
   res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','Vary':'Cookie',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"frame-ancestors 'none'; base-uri 'self'; object-src 'none'",...extra});
   res.end(req.method==='HEAD'?undefined:body);
  };
  try{
   // Reject ambiguous/encoded paths before URL normalization or filesystem access.
   const raw=req.url.split('?')[0];
   if(!raw.startsWith('/')||raw.includes('..')||raw.includes('%')||raw.includes('\\')||raw.includes('//'))return send(400,'Invalid path');
   const path=raw==='/'?'/index.html':raw;
   if(path==='/__maintenance/health')return send(200,'Staging gateway running');
   if(path==='/__maintenance/session'){
    if(!['POST','DELETE'].includes(req.method))return send(405,'Method not allowed',undefined,{Allow:'POST, DELETE'});
    if(req.headers.origin!==config.siteOrigin)return send(403,'Same-origin request required');
    const id=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
    if(id)sessions.delete(id);
    if(req.method==='DELETE')return send(204,'',undefined,{'Set-Cookie':cookie('',0)});
    const auth=req.headers.authorization||'';
    if(!auth.startsWith('Bearer ')||auth.length>8192||!await owner(auth.slice(7)))
     return send(403,'Verified staging owner access required',undefined,{'Set-Cookie':cookie('',0)});
    for(const [key,session] of sessions)if(session.expires<=now())sessions.delete(key);
    if(sessions.size>=1000)return send(503,'Staging session capacity reached');
    const sessionId=randomBytes(32).toString('hex');
    sessions.set(sessionId,{token:auth.slice(7),expires:now()+TTL});
    return send(204,'',undefined,{'Set-Cookie':cookie(sessionId,TTL/1000)});
   }
   if(!['GET','HEAD'].includes(req.method))return send(405,'Method not allowed',undefined,{Allow:'GET, HEAD'});
   if(path==='/config.js')return send(200,`export const SUPABASE_URL=${JSON.stringify(config.supabaseUrl)};\nexport const SUPABASE_ANON_KEY=${JSON.stringify(config.key)};\n`,'text/javascript; charset=utf-8');
   if(path==='/__maintenance/bridge.js')return send(200,await readFile(new URL('./staging-owner-bridge.js',import.meta.url)),'text/javascript; charset=utf-8');
   const name=path.slice(1);
   // Never publish repository SQL, credentials, scripts, tests, or server source.
   if(!FILES.has(name))return send(404,'Not found');
   if(!PUBLIC.has(path)){
    const id=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
    const session=sessions.get(id);
    const bypass=!!session&&session.expires>now()&&await owner(session.token);
    if(session&&!bypass)sessions.delete(id);
    if(!bypass){
     let state;
     try{
      const rows=await api('/rest/v1/site_maintenance?select=enabled,message&id=eq.true');
      if(!Array.isArray(rows)||rows.length!==1||typeof rows[0].enabled!=='boolean')throw new Error('Missing maintenance state');
      state=rows[0];
     }catch{state={enabled:true,message:'Staging access is temporarily unavailable. Please try again.'};}
     if(state.enabled)return send(503,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartoon Universe Maintenance</title><body><h1>Cartoon Universe — Under Maintenance</h1><p>${escape(state.message||'We will be back soon.')}</p><a href="/login.html">Owner sign-in</a></body></html>`,'text/html; charset=utf-8',{'Retry-After':'60'});
    }
   }
   const file=await realpath(resolve(root,name));
   const base=await realpath(root);
   if(!file.startsWith(base+sep))return send(404,'Not found');
   let body=await readFile(file);
   if(path==='/login.html'){
    // The advisory overlay would hide sign-in during maintenance; the server gate
    // replaces it here. All checked-in static pages remain unchanged.
    body=body.toString().replace(/<script[^>]*src="maintenance-notice\.js"[^>]*><\/script>/g,'')
     .replace('</body>','<script type="module" src="/__maintenance/bridge.js"></script></body>');
   }
   return send(200,body,TYPES[extname(name)]||'application/octet-stream');
  }catch{return send(503,'Staging gateway temporarily unavailable');}
 });
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=stagingConfig(process.env);
 const server=createGateway({config});
 server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Staging maintenance gateway listening'));
 process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
