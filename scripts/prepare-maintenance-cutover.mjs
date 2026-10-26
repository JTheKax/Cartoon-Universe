// Local review-bundle generator. No Render/Supabase calls, deployment, or SQL.
import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {productionSiteOrigin} from '../server/production-maintenance-gateway.mjs';

const SOURCE_ORIGIN='https://cartoon-universe-3.onrender.com';
const SOURCE_SERVICE='srv-dbeg2nu7bikc738b8ulg';
const paths=['/','/index.html','/login.html','/register.html','/account.html','/owner.html','/coin-wallet.html','/styles.css','/account.css','/owner.css','/script.js','/auth.js','/supabase-config.js','/config.js','/theme.js','/admin-nav.js','/home-profile.js','/coin-wallet.js','/owner.js','/maintenance-preview.js','/maintenance-controls.js','/maintenance-notice.js','/static/cartoon-carnival.png','/static/haunted-arcade.gif','/supabase/schema.sql','/login.html?type=recovery'];

export function cutoverPlan(target){
 const targetOrigin=productionSiteOrigin(target);
 if(targetOrigin===SOURCE_ORIGIN)throw new Error('The target must be a different gateway origin; refusing a redirect loop.');
 return {
  version:1,status:'review-only',sourceServiceId:SOURCE_SERVICE,sourceOrigin:SOURCE_ORIGIN,targetOrigin,
  productionGatewayEnabled:false,maintenanceActivation:'locked',autoDeployTrigger:'off',
  publicationDirectory:'public',publicationFiles:['cutover.txt'],
  routes:[{type:'redirect',source:'/',destination:targetOrigin+'/'},{type:'redirect',source:'/*',destination:targetOrigin+'/*'}],
  verifyPaths:paths,
  browserFragmentProbe:'/login.html#cutover-test-marker',
  requiredChecks:['Verify the target hostname is allocated and hosted HTTPS owner access works.','Inventory existing redirect rules and every website alias before replacing any routing configuration.','Publish only the generated public directory; original website resources must not remain at the old origin.','Verify redirects for every listed old path, including query strings and a browser fragment probe.','Verify Auth recovery/confirmation and username-login against the actual canonical origin.','Keep production maintenance OFF and the activation interlock locked until routing and database enforcement are verified.']
 };
}

export async function prepareCutoverBundle(target,output){
 const plan=cutoverPlan(target);
 if(!output)throw new Error('An empty output directory is required.');
 const directory=resolve(output);
 try{
  if((await readdir(directory)).length)throw new Error('Refusing to overwrite a nonempty output directory.');
 }catch(error){
  if(error.code!=='ENOENT')throw error;
  await mkdir(directory); // No recursive creation of an unintended parent tree.
 }
 await mkdir(join(directory,'public'));
 const write=(name,value)=>writeFile(join(directory,name),value,{flag:'wx'});
 await write('public/cutover.txt','This publication contains no Cartoon Universe application files.\n');
 await write('cutover.review.json',JSON.stringify(plan,null,2)+'\n');
 await write('render-routes.review.json',JSON.stringify(plan.routes,null,2)+'\n');
 await write('README.txt',[
  'REVIEW ONLY. Nothing has been applied to Render or Supabase.',
  'Old origin: '+plan.sourceOrigin,
  'Target origin: '+plan.targetOrigin,
  'Verify the target is live; install the reviewed routes before switching the old publication.',
  'Publish ONLY the public subdirectory after the cutover review is complete.',
  'Do not publish this whole bundle or keep the old full-site publication.',
  'Route rules are review material. Inspect existing rules before any replacement.',
  'Render redirects do not override existing files. Verify every old website path.',
  'Query/fragment and real Auth-link behavior require hosted/browser verification.',
  'Production startup, auto-deploy, and maintenance activation remain disabled.',
  'No accounts, wallets, sessions, settings, or infrastructure were modified.'
 ].join('\n')+'\n');
 return {directory,plan};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==4||args[0]!=='--target'||args[2]!=='--output')throw new Error('Usage: node scripts/prepare-maintenance-cutover.mjs --target HTTPS_ORIGIN --output EMPTY_DIRECTORY');
  const result=await prepareCutoverBundle(args[1],args[3]);
  console.log(JSON.stringify({status:'review-only',directory:result.directory,targetOrigin:result.plan.targetOrigin,publishDirectory:join(result.directory,'public')}));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
