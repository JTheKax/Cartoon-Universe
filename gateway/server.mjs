import http from 'node:http';
import { randomUUID } from 'node:crypto';

const origin = process.env.STATIC_ORIGIN || 'https://cartoon-universe-3.onrender.com';
const supabase = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const port = Number(process.env.PORT || 10000);
if (!supabase || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
const api = supabase.replace(/\/$/, '') + '/rest/v1/';
const baseHeaders = {apikey:key,Authorization:'Bearer '+key};
const noCache = {'Cache-Control':'no-store, private','Vary':'Cookie'};
const timeout = AbortSignal.timeout(4500);
async function settings() {
  const r = await fetch(api+'site_maintenance?select=enabled,message&id=eq.true',{headers:baseHeaders,signal:timeout()});
  if(!r.ok) throw new Error('Maintenance settings unavailable');
  const rows=await r.json();
  if(rows.length!==1) throw new Error('Maintenance settings missing');
  return rows[0];
}
async function owner(token) {
  if(!token) return false;
  const u=await fetch(supabase.replace(/\/$/,'')+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},signal:timeout()});
  if(!u.ok) return false;
  const user=await u.json();
  if(!user.id) return false;
  const r=await fetch(api+'owner_members?select=user_id&user_id=eq.'+encodeURIComponent(user.id),{headers:{apikey:key,Authorization:'Bearer '+token},signal:timeout()});
  return r.ok && (await r.json()).some(row=>row.user_id===user.id);
}
function cookie(req,name) {
  const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));
  return raw?decodeURIComponent(raw.slice(name.length+1)):'';
}
function html(message) {
  const escaped=String(message).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maintenance | Cartoon Universe</title><style>body{margin:0;background:radial-gradient(circle,#34205c,#0b071c);color:white;font:20px system-ui;display:grid;place-items:center;min-height:100vh;text-align:center}main{max-width:650px;padding:3rem;border:2px solid #b178ff;border-radius:25px;box-shadow:0 0 50px #7035bb}h1{color:#ffa4f4}</style><main><div style="font-size:4rem">🎃 🛠️</div><h1>Cartoon Universe Under Maintenance</h1><p>${escaped}</p><p>We'll be back soon!</p></main></html>`;
}
export function createHandler({getSettings=settings,isOwner=owner,upstream=origin}={}) {
  return async (req,res) => {
    try {
      const url=new URL(req.url,'http://gateway.local');
      if(url.pathname==='/__gateway/health') {res.writeHead(200,{'Content-Type':'application/json',...noCache});res.end('{"ok":true}');return;}
      const state=await getSettings();
      let bypass=false;
      if(state.enabled) {
        try {bypass=await isOwner(cookie(req,'cu_owner_access'));} catch {bypass=false;}
        if(!bypass) {
          res.writeHead(503,{'Content-Type':'text/html; charset=utf-8','Retry-After':'300',...noCache});
          res.end(req.method==='HEAD'?'':html(state.message));return;
        }
      }
      const target=new URL(url.pathname+url.search,upstream);
      const headers={};
      for(const name of ['accept','accept-language','content-type','range','if-none-match','if-modified-since']) if(req.headers[name]) headers[name]=req.headers[name];
      const response=await fetch(target,{method:req.method==='HEAD'?'HEAD':'GET',headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
      const forwarded={...noCache};
      for(const name of ['content-type','content-length','content-range','etag','last-modified','location']) if(response.headers.has(name)) forwarded[name]=response.headers.get(name);
      res.writeHead(response.status,forwarded);
      if(req.method==='HEAD'||!response.body){res.end();return;}
      for await (const chunk of response.body) res.write(chunk);
      res.end();
    } catch(e) {
      res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8',...noCache});
      res.end('Cartoon Universe is temporarily unavailable.');
    }
  };
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href) {
  http.createServer(createHandler()).listen(port,'0.0.0.0',()=>console.log('Gateway listening on '+port));
}
