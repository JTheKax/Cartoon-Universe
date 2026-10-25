// Review-only production entry point. Disabled unless explicitly configured.
// This process never applies SQL or changes the maintenance flag.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isIP} from 'node:net';
import {createGateway} from './maintenance-gateway.mjs';

const PROJECT_URL='https://gjfyemvcrgrthbrlqqnz.supabase.co';
export function productionConfig(env){
 if(env.PRODUCTION_GATEWAY_ENABLED!=='true')throw new Error('Production gateway startup is disabled pending routing review.');
 const url=new URL(env.PRODUCTION_SUPABASE_URL);
 if(url.origin!==PROJECT_URL||url.href.replace(/\/$/,'')!==PROJECT_URL)
  throw new Error('The explicit Cartoon Universe production project URL is required.');
 const key=env.PRODUCTION_SUPABASE_PUBLISHABLE_KEY;
 if(typeof key!=='string'||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)||key.length<=30)
  throw new Error('Use a production publishable key; secret/service-role and legacy keys are forbidden.');
 const site=new URL(env.PRODUCTION_SITE_ORIGIN);
 const host=site.hostname.replace(/^\[|\]$/g,'');
 if(site.protocol!=='https:'||site.port||site.href.replace(/\/$/,'')!==site.origin
   ||isIP(host)||!host.includes('.')||host.length>253
   ||!host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
   ||/(?:^|\.)(?:localhost|test|invalid|example)$/.test(host))
  throw new Error('A concrete canonical HTTPS production origin without path, credentials, query, fragment, or port is required.');
 return {supabaseUrl:PROJECT_URL,key,siteOrigin:site.origin,secure:true,mode:'production',cookieName:'__Host-cu_owner'};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createGateway({config:productionConfig(process.env)});
 server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Owner maintenance gateway listening'));
 process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
}
