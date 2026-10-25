// Isolated address-verification page. No Supabase client, database, or gate activation.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {productionSiteOrigin} from './production-maintenance-gateway.mjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartoon Universe Gateway Setup</title><body><main><h1>Cartoon Universe gateway setup</h1><p>This address is being prepared.</p><p><a href="https://cartoon-universe-3.onrender.com">Continue to the current arcade</a></p></main></body></html>';
export function createCandidateServer({origin,now=Date.now}={}){
 const expectedOrigin=origin?productionSiteOrigin(origin):null;
 const probes=new Map();
 const cookieName='__Host-cu_probe';
 const setCookie=(nonce,age)=>`${cookieName}=${nonce}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}; Secure`;
 return createServer((req,res)=>{
  const path=req.url.split('?')[0];
  const readable=req.method==='GET'||req.method==='HEAD';
  const send=(code,body,type='text/plain; charset=utf-8',extra={})=>{
   res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",...extra});
   res.end(req.method==='HEAD'?undefined:body);
  };
  const nonce=(req.headers.cookie||'').split(';').map(value=>value.trim()).find(value=>value.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(path==='/__maintenance/cookie-probe'){
   if(!expectedOrigin)return send(503,'Cookie probe is not configured');
   if(!['POST','DELETE'].includes(req.method))return send(405,'Method not allowed',undefined,{Allow:'POST, DELETE'});
   if(req.headers.origin!==expectedOrigin)return send(403,'Same-origin request required');
   if(nonce)probes.delete(nonce);
   if(req.method==='DELETE')return send(204,'',undefined,{'Set-Cookie':setCookie('',0)});
   for(const [value,expiry] of probes)if(expiry<=now())probes.delete(value);
   if(probes.size>=1000)return send(503,'Probe capacity reached');
   const value=randomBytes(24).toString('hex');probes.set(value,now()+60000);
   return send(204,'',undefined,{'Set-Cookie':setCookie(value,60)});
  }
  if(path==='/__maintenance/cookie-check'){
   if(!readable)return send(405,'Method not allowed',undefined,{Allow:'GET, HEAD'});
   return send(200,JSON.stringify({received:!!nonce&&(probes.get(nonce)||0)>now(),authority:'none'}),'application/json; charset=utf-8');
  }
  const health=path==='/__maintenance/health';
  const code=!readable?405:health?200:503;
  return send(code,!readable?'Method not allowed':health?'Gateway candidate setup running':html,readable&&!health?'text/html; charset=utf-8':'text/plain; charset=utf-8',{
   ...(code===503?{'Retry-After':'60'}:{}),...(code===405?{Allow:'GET, HEAD'}:{})
  });
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.env.GATEWAY_CANDIDATE_MODE!=='true'||process.env.PRODUCTION_GATEWAY_ENABLED==='true')throw new Error('Only isolated candidate mode is permitted by this entry point.');
 const server=createCandidateServer({origin:process.env.CANDIDATE_SITE_ORIGIN});
 server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Isolated gateway candidate listening'));
 process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
