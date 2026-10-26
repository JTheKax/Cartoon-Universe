// Review-only public release packaging. Never deploys or accesses production.
// Run: node scripts/build-public-release.mjs [output-directory]
// Default output: .release-review/public (ignored by Render unless explicitly configured).
import {readFile, mkdir, copyFile, readdir, writeFile} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=[
 'index.html','login.html','register.html','account.html','coin-wallet.html',
 'styles.css','account.css',
 'script.js','auth.js','supabase-config.js','config.js','theme.js',
 'admin-nav.js','home-profile.js','coin-wallet.js',
 'maintenance-notice.js',
 'static/cartoon-carnival.png','static/haunted-arcade.gif'
];
// owner.html is deliberately excluded: public owner access belongs at the protected gateway.
export async function buildPublicRelease(destination=join(root,'.release-review/public')){
 const out=resolve(destination);
 if(out===root||root.startsWith(out+'/'))throw Error('Refusing repository root or ancestor output');
 try{if((await readdir(out)).length)throw Error('Output must be empty');}
 catch(e){if(e.code!=='ENOENT')throw e;}
 const missing=[];
 for(const path of files){try{await readFile(join(root,path));}catch(e){if(e.code==='ENOENT')missing.push(path);else throw e;}}
 if(missing.length)throw Error('Missing allowlisted assets: '+missing.join(', '));
 await mkdir(out,{recursive:true});
 for(const path of files){await mkdir(dirname(join(out,path)),{recursive:true});await copyFile(join(root,path),join(out,path));}
 // Replace legacy owner-page links with the dedicated protected gateway.
 for(const path of files.filter(x=>x.endsWith('.html'))){
  const target=join(out,path);
  const html=await readFile(target,'utf8');
  await writeFile(target,html.replace(/(["'])owner\.html\1/g,'"https://cartoon-universe-gateway.onrender.com/__maintenance/owner-signin"'));
 }
 // Fail closed on obvious broken references; browser-level verification still required.
 for(const path of files.filter(x=>x.endsWith('.html'))){
  const html=await readFile(join(out,path),'utf8');
  for(const match of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/g)){
   const ref=match[1];
   if(/^(?:https?:|mailto:|tel:|data:|\/)/i.test(ref))continue;
   if(!files.includes(ref))throw Error('Unallowlisted local reference '+ref+' in '+path);
  }
 }
 return {output:out,files:files.length,status:'review-only',deployed:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 buildPublicRelease(process.argv[2]).then(result=>console.log(JSON.stringify(result))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
