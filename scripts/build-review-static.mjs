// Review-only static bundle. Never use this as the public maintenance gateway.
import {readFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

if(process.env.CARTOON_UNIVERSE_REVIEW_BUILD!=='true'){
 throw new Error('Review-only build: set CARTOON_UNIVERSE_REVIEW_BUILD=true explicitly.');
}
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
// Render's existing isolated static preview publishes preview-public; explicit paths remain supported for CI.
const destination=resolve(process.argv[2]||'preview-public');
const source=readFileSync(resolve(root,'server/gateway-candidate.mjs'),'utf8');
const list=source.match(/const ARCADE_FILES=new Set\(\[([\s\S]*?)\]\);/)?.[1];
if(!list)throw new Error('Cannot determine reviewed front-end asset allowlist.');
const files=[...new Set([...list.matchAll(/'([^']+)'/g)].map(m=>m[1]))];
files.push('sticker-catalog.json');
for(const name of files){
 const input=resolve(root,name),output=resolve(destination,name);
 if(isAbsolute(name)||name.includes('..')||relative(root,input).startsWith('..'))throw new Error('Unsafe review asset path: '+name);
 if(!existsSync(input))throw new Error('Missing reviewed asset: '+name);
 mkdirSync(dirname(output),{recursive:true});
 copyFileSync(input,output);
}
copyFileSync(resolve(root,'preview-public/_redirects'),resolve(destination,'_redirects'));
console.log('Prepared '+files.length+' allowlisted assets for isolated static review at '+destination);
