// Isolated address-verification page. No Supabase client, database, or gate activation.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import {sep,extname} from 'node:path';
import {createOwnerVerification} from './owner-verification.mjs';
import {productionSiteOrigin} from './production-maintenance-gateway.mjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const ARCADE_FILES=new Set(['index.html','login.html','register.html','account.html','coin-wallet.html','owner.html','styles.css','account.css','owner.css','clean-arcade.css','script.js','auth.js','config.js','supabase-config.js','theme.js','logo-preferences.js','admin-nav.js','home-profile.js','coin-wallet.js','owner.js','maintenance-preview.js','maintenance-controls.js','maintenance-notice.js','static/cartoon-carnival.png','static/haunted-arcade.gif','static/theater.html','static/theater.js','static/dark-side-ring-blue-cover.svg','shop-preview.js','shop-auctions.html','shop-cards-battle.html','shop-cards-deck-build.html','shop-cards.html','shop-collect-encyclopedia.html','shop-collect-my-collection.html','shop-collect-my-scene.html','shop-collect-wishlist.html','shop-collect.html','shop-collectibles.html','shop-community-forums.html','shop-community-help.html','shop-community-support.html','shop-community.html','shop-games-arcade.html','shop-games-claw-machine.html','shop-games-monster-catcher.html','shop-games-prize-wheel.html','shop-games-retro-games.html','shop-games.html','shop-my-shop.html','shop-packs.html','shop-recycler.html','shop-shop.html','shop-watch-anime.html','shop-watch-cartoons.html','shop-watch-misc.html','shop-watch-movies.html','shop-watch.html','nav-account-controls.js','shop-collect-controller.js','shop-inventory-controller.js','shop-local-movie.js','account-redirect.js','sticker-catalog.json','assets/appearance-catalog.json']);
const ARCADE_TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const html=ownerLoginLink=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cartoon Universe Gateway Setup</title><body><main><h1>Cartoon Universe gateway setup</h1><p>This address is being prepared.</p><p>Arcade access is unavailable from this setup page. Verified owners should use the approved owner access flow.</p>${ownerLoginLink}</main></body></html>`;
export function createCandidateServer({origin,now=Date.now,ownerVerification,fetchImpl=fetch,onOwnerVerified,arcadeRoot=resolve(fileURLToPath(new URL('..',import.meta.url)))}={}){
 const expectedOrigin=origin?productionSiteOrigin(origin):null;
 const verifyOwner=ownerVerification?createOwnerVerification({origin:expectedOrigin,...ownerVerification,fetchImpl,now,onVerified:onOwnerVerified}):null;
 const probes=new Map();
 const cookieName='__Host-cu_probe';
 const setCookie=(nonce,age)=>`${cookieName}=${nonce}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}; Secure`;
 return createServer(async(req,res)=>{
  const path=req.url.split('?')[0];
  const readable=req.method==='GET'||req.method==='HEAD';
  const send=(code,body,type='text/plain; charset=utf-8',extra={})=>{
   res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",...extra});
   res.end(req.method==='HEAD'?undefined:body);
  };
  if(verifyOwner&&await verifyOwner(req,send))return;
  if(path==='/__maintenance/arcade'||path.startsWith('/__maintenance/arcade/')){
   if(!readable)return send(405,'Method not allowed',undefined,{Allow:'GET, HEAD'});
   if(!verifyOwner||!await verifyOwner.authorized(req))return send(503,'Owner verification required',undefined,{'Retry-After':'60'});
   const name=path==='/__maintenance/arcade'||path==='/__maintenance/arcade/'?'index.html':path.slice('/__maintenance/arcade/'.length);
   if(!ARCADE_FILES.has(name))return send(404,'Not found');
   try{
    const base=await realpath(arcadeRoot);
    const file=await realpath(resolve(base,name));
    if(!file.startsWith(base+sep))return send(404,'Not found');
    let body=await readFile(file);
    if(extname(name)==='.html'){
     // Relative arcade URLs resolve under the protected prefix. Absolute site paths remain blocked.
     // Use the static subdirectory base for the standalone theater, so its
     // parent-relative styles and home links stay behind owner verification.
     const protectedBase=name==='static/theater.html'?'/__maintenance/arcade/static/':'/__maintenance/arcade/';
     body=body.toString().replace(/<head([^>]*)>/i,'<head$1><base href="'+protectedBase+'">');
    }
    return send(200,body,ARCADE_TYPES[extname(name)]||'application/octet-stream',{'Content-Security-Policy':"default-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self' https://gjfyemvcrgrthbrlqqnz.supabase.co; style-src 'self' 'unsafe-inline'; script-src 'self' https://esm.sh; base-uri 'self'; frame-ancestors 'none'"});
   }catch{return send(503,'Arcade asset unavailable');}
  }
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
  return send(code,!readable?'Method not allowed':health?'Gateway candidate setup running':html(verifyOwner?'<p><a href="/__maintenance/owner-signin">Owner Login</a></p>':''),readable&&!health?'text/html; charset=utf-8':'text/plain; charset=utf-8',{
   ...(code===503?{'Retry-After':'60'}:{}),...(code===405?{Allow:'GET, HEAD'}:{})
  });
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.env.GATEWAY_CANDIDATE_MODE!=='true'||process.env.PRODUCTION_GATEWAY_ENABLED==='true')throw new Error('Only isolated candidate mode is permitted by this entry point.');
 const server=createCandidateServer({origin:process.env.CANDIDATE_SITE_ORIGIN,ownerVerification:process.env.CANDIDATE_OWNER_VERIFICATION_ENABLED==='true'?{supabaseUrl:process.env.CANDIDATE_SUPABASE_URL,publishableKey:process.env.CANDIDATE_SUPABASE_PUBLISHABLE_KEY}:undefined,onOwnerVerified:()=>console.log('Owner sign-in verified (read-only candidate)')});
 server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Isolated gateway candidate listening'));
 process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
