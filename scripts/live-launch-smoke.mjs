// Anonymous, read-only public launch checks. No credentials or writes.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export const GATEWAY='https://cartoon-universe-gateway.onrender.com';
export const PUBLIC='https://cartoon-universe-3.onrender.com';
const checks=[
 ['public redirect',PUBLIC,'/','redirect'],
 ['gateway health',GATEWAY,'/__maintenance/health','public'],
 ['owner sign-in',GATEWAY,'/__maintenance/owner-signin','public'],
 ['password recovery',GATEWAY,'/__maintenance/password-recovery','public'],
 ['homepage',GATEWAY,'/','public'],
 ['player login',GATEWAY,'/login.html','public'],
 ['registration',GATEWAY,'/register.html','public'],
 ['Cartoon Coin wallet',GATEWAY,'/coin-wallet.html','public'],
 ['Movie Theater',GATEWAY,'/static/theater.html','public'],
 ['global chat asset',GATEWAY,'/global-chat.js','public'],
 ['news asset',GATEWAY,'/home-news.js','public'],
 ['retro library asset',GATEWAY,'/retro-game-library.js','public'],
 ['DVD library asset',GATEWAY,'/static/theater-dvd-library.js','public'],
 ['owner dashboard',GATEWAY,'/owner.html','protected'],
 ['owner coin controls',GATEWAY,'/owner-coin-adjustments.js','protected'],
 ['owner arcade',GATEWAY,'/__maintenance/arcade/','protected'],
 ['server source',GATEWAY,'/server/public-launch-gateway.mjs','missing'],
 ['SQL source',GATEWAY,'/review-owner-coin-adjustments.sql','missing']
];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function classify(body){
 if(body.includes('Under Maintenance'))return 'maintenance-page';
 if(body.includes('Gateway temporarily unavailable'))return 'gateway-upstream-error';
 if(body.includes('Service Unavailable'))return 'service-unavailable';
 return 'unclassified';
}
export async function runLaunchSmoke({fetchImpl=fetch,log=console.log,delay=sleep}={}){
 const results=[];
 for(const [label,origin,path,kind] of checks){
  let status=0,location='',body='',error='';
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await fetchImpl(origin+path,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(45000)});
    status=response.status;location=response.headers.get('location')||'';
    body=await response.text();error='';
    // Free Render services can briefly return 502/503 while waking up.
    if((status===502||status===503)&&attempt<2){await delay(2500);continue;}
    break;
   }catch(e){error=e?.name==='TimeoutError'?'timeout':'network-error';if(attempt<2){await delay(2500);continue;}}
  }
  let ok=false;
  if(kind==='redirect'){
   const target=new URL(location||'/',origin);
   ok=[301,302,307,308].includes(status)&&target.origin===GATEWAY&&target.pathname==='/';
  }else if(kind==='public')ok=status===200;
  else if(kind==='protected'){
   const target=new URL(location||'/',origin);
   ok=status===403||(status===302&&target.origin===GATEWAY&&target.pathname==='/__maintenance/owner-signin');
  }else ok=status===404;
  const marker=status===503?classify(body):'';
  results.push({label,status,ok,marker,error});
  log((ok?'PASS':'FAIL')+' '+label+': HTTP '+(status||'network error')+(marker?' ('+marker+')':'')+(error?' ('+error+')':''));
 }
 const failures=results.filter(x=>!x.ok);
 log(failures.length?'BLOCKED: '+failures.length+' anonymous checks failed. Do not claim launch verified.':'PASS: '+results.length+' anonymous live routes. Real authenticated owner/player tests are still required.');
 return {results,failures};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const {failures}=await runLaunchSmoke();
 if(failures.length)process.exitCode=1;
}
