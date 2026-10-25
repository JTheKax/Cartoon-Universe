// Isolated address-verification page. No Supabase client, database, or gate activation.
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartoon Universe Gateway Setup</title><body><main><h1>Cartoon Universe gateway setup</h1><p>This address is being prepared.</p><p><a href="https://cartoon-universe-3.onrender.com">Continue to the current arcade</a></p></main></body></html>';
export function createCandidateServer(){
 return createServer((req,res)=>{
  const readable=req.method==='GET'||req.method==='HEAD';
  const health=req.url.split('?')[0]==='/__maintenance/health';
  const code=!readable?405:health?200:503;
  const body=!readable?'Method not allowed':health?'Gateway candidate setup running':html;
  res.writeHead(code,{'Content-Type':readable&&!health?'text/html; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'",...(code===503?{'Retry-After':'60'}:{}),...(code===405?{Allow:'GET, HEAD'}:{})});
  res.end(req.method==='HEAD'?undefined:body);
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.env.GATEWAY_CANDIDATE_MODE!=='true'||process.env.PRODUCTION_GATEWAY_ENABLED==='true')throw new Error('Only isolated candidate mode is permitted by this entry point.');
 const server=createCandidateServer();
 server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Isolated gateway candidate listening'));
 process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
