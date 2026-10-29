// Production public web gateway. Separate from the read-only candidate and review-static builder.
// No SQL writes, maintenance toggles, or deployment side effects.
import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOwnerVerification} from './owner-verification.mjs';
import {productionSiteOrigin} from './production-maintenance-gateway.mjs';

const PROJECT='https://gjfyemvcrgrthbrlqqnz.supabase.co';
const ASSETS=new Set(`
index.html login.html register.html account.html coin-wallet.html owner.html
styles.css account.css owner.css clean-arcade.css script.js auth.js config.js
supabase-config.js theme.js logo-preferences.js admin-nav.js home-profile.js
coin-wallet.js global-chat.js home-news.js owner.js owner-coin-adjustments.js owner-theater.js maintenance-preview.js maintenance-controls.js maintenance-notice.js
nav-account-controls.js retro-game-library.js shop-preview.js shop-collect-controller.js
shop-inventory-controller.js shop-local-movie.js account-redirect.js sticker-catalog.json
assets/appearance-catalog.json static/cartoon-carnival.png static/haunted-arcade.gif
static/theater.html static/theater.js static/theater-dvd-library.js static/dark-side-ring-blue-cover.svg static/yu-gi-oh-gx-cover.jpg
shop-auctions.html shop-cards-battle.html shop-cards-deck-build.html shop-cards.html
shop-collect-encyclopedia.html shop-collect-my-collection.html
shop-collect-my-scene.html shop-collect-wishlist.html shop-collect.html
shop-collectibles.html shop-community-forums.html shop-community-help.html
shop-community-support.html shop-community.html shop-games-arcade.html
shop-games-claw-machine.html shop-games-monster-catcher.html
shop-games-prize-wheel.html shop-games-retro-games.html shop-games.html
shop-my-shop.html shop-packs.html shop-recycler.html shop-shop.html
shop-watch-anime.html shop-watch-cartoons.html shop-watch-misc.html
shop-watch-movies.html shop-watch.html
`.trim().split(/\s+/));
const OWNER_ONLY=new Set(['owner.html','owner.js','owner-coin-adjustments.js','owner-theater.js','owner.css','maintenance-controls.js','maintenance-preview.js']);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.png':'image/png','.gif':'image/gif',
 '.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicGatewayConfig(env){
 if(env.PUBLIC_GATEWAY_LAUNCH_MODE!=='enabled'||env.GATEWAY_CANDIDATE_MODE==='true')
  throw new Error('Separate public gateway is disabled; candidate mode is never a production entry point.');
 if(env.PRODUCTION_SUPABASE_URL!==PROJECT)
  throw new Error('Explicit production Supabase URL required.');
 const key=env.PRODUCTION_SUPABASE_PUBLISHABLE_KEY;
 if(typeof key!=='string'||!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key))
  throw new Error('Production publishable key required; secret and service-role keys forbidden.');
 const origin=productionSiteOrigin(env.PRODUCTION_SITE_ORIGIN);
 return {origin,key,supabaseUrl:PROJECT};
}
export function createPublicGateway({config,fetchImpl=fetch,now=Date.now,
 root=resolve(fileURLToPath(new URL('..',import.meta.url)))}={}){
 if(!config||config.supabaseUrl!==PROJECT||!config.origin||!config.key)
  throw new Error('Validated production gateway config required.');
 const owner=createOwnerVerification({
  origin:config.origin,supabaseUrl:config.supabaseUrl,
  publishableKey:config.key,fetchImpl,now
 });
 const csp=`default-src 'self'; script-src 'self' https://esm.sh https://cdn.emulatorjs.org 'unsafe-eval'; connect-src 'self' ${PROJECT} https://cdn.emulatorjs.org wss://gjfyemvcrgrthbrlqqnz.supabase.co; img-src 'self' data: blob: ${PROJECT} https://cdn.emulatorjs.org; media-src 'self' blob: ${PROJECT} https://cdn.emulatorjs.org; frame-src https://www.youtube-nocookie.com; style-src 'self' 'unsafe-inline' https://cdn.emulatorjs.org; worker-src 'self' blob: https://cdn.emulatorjs.org; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`;
 async function maintenance(){
  try{
   const response=await fetchImpl(PROJECT+'/rest/v1/site_maintenance?select=enabled,message&id=eq.true',{
    headers:{apikey:config.key},redirect:'error',signal:AbortSignal.timeout(5000)
   });
   if(!response.ok)return null;
   const rows=await response.json();
   if(!Array.isArray(rows)||rows.length!==1||typeof rows[0].enabled!=='boolean')return null;
   return rows[0];
  }catch{return null;}
 }
 return createServer(async(req,res)=>{
  const send=(code,body,type='text/plain; charset=utf-8',extra={})=>{
   res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','Vary':'Cookie',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':csp,...extra});
   res.end(req.method==='HEAD'?undefined:body);
  };
  try{
   const raw=(req.url||'').split('?')[0];
   if(!raw.startsWith('/')||raw.includes('%')||raw.includes('..')||
      raw.includes('\\')||raw.includes('//')||raw.includes('\0'))
    return send(400,'Invalid path');
   if(await owner(req,send))return;
   if(raw==='/__maintenance/health'){
    if(!['GET','HEAD'].includes(req.method))return send(405,'Method not allowed',undefined,{Allow:'GET, HEAD'});
    return send(200,'Public gateway process running; not a launch-readiness assertion');
   }
   if(!['GET','HEAD'].includes(req.method))
    return send(405,'Method not allowed',undefined,{Allow:'GET, HEAD'});
   const prefix='/__maintenance/arcade/';
   const protectedRoute=raw==='/__maintenance/arcade'||raw.startsWith(prefix);
   const name=protectedRoute?
    (raw==='/__maintenance/arcade'||raw===prefix?'index.html':raw.slice(prefix.length)):
    (raw==='/'?'index.html':raw.slice(1));
   if(!ASSETS.has(name))return send(404,'Not found');
   const verified=protectedRoute||OWNER_ONLY.has(name)?await owner.authorized(req):false;
   if((protectedRoute||OWNER_ONLY.has(name))&&!verified)
    return send(302,'','text/plain; charset=utf-8',{Location:'/__maintenance/owner-signin?next='+encodeURIComponent(raw)});
   // Every normal public request is maintenance-gated. Upstream errors fail closed.
   if(!protectedRoute){
    const state=await maintenance();
    if(!state||state.enabled){
     const message=state?.message||'The arcade is temporarily unavailable. Please check back later.';
     const body='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Cartoon Universe Maintenance</title></head><body><main><h1>Cartoon Universe — Under Maintenance</h1><p>'+escapeHtml(message)+'</p><a href="/__maintenance/owner-signin">Owner Login</a></main></body></html>';
     return send(503,body,'text/html; charset=utf-8',{'Retry-After':'60'});
    }
   }
   const base=await realpath(root);
   const file=await realpath(resolve(base,name));
   if(!file.startsWith(base+sep))return send(404,'Not found');
   let body=await readFile(file);
   if(extname(name)==='.html')body=body.toString().replace('</body>','<script type="module" src="'+(protectedRoute?prefix:'/')+'global-chat.js"></script></body>');
   if(protectedRoute&&extname(name)==='.html'){
    const baseHref=name==='static/theater.html'?prefix+'static/':prefix;
    body=body.toString().replace(/<head([^>]*)>/i,'<head$1><base href="'+baseHref+'">');
   }
   return send(200,body,TYPES[extname(name)]||'application/octet-stream');
  }catch{return send(503,'Gateway temporarily unavailable');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createPublicGateway({config:publicGatewayConfig(process.env)});
 server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Separate public gateway listening'));
 process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
