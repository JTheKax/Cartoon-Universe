// Read-only prelaunch acceptance checks. Never sign in, mutate maintenance or claim launch.
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const PUBLIC='https://cartoon-universe-3.onrender.com';
const GATEWAY='https://cartoon-universe-gateway.onrender.com';
const checks=[
  {name:'public maintenance holding page',origin:'public',path:'/',status:200,body:/under maintenance/i},
  {name:'separate production gateway process',path:'/__maintenance/health',status:200,body:/Public gateway process running/},
  {name:'owner sign-in',path:'/__maintenance/owner-signin',status:200,body:/Verify owner sign-in/},
  {name:'password recovery',path:'/__maintenance/password-recovery',status:200,body:/Reset your Cartoon Universe password/},
  {name:'anonymous owner status',path:'/__maintenance/owner-status',status:200,json:{ownerVerified:false}},
  {name:'public homepage maintenance gate',path:'/',status:503,body:/Under Maintenance/,retry:true},
  {name:'player wallet maintenance gate',path:'/coin-wallet.html',status:503,body:/Under Maintenance/,retry:true},
  {name:'theater maintenance gate',path:'/static/theater.html',status:503,body:/Under Maintenance/,retry:true},
  {name:'owner dashboard denied',path:'/owner.html',status:403},
  {name:'protected owner arcade denied',path:'/__maintenance/arcade/',status:403},
  {name:'source file not exposed',path:'/server/public-launch-gateway.mjs',status:404},
  {name:'database source not exposed',path:'/sql/tests/ci_bootstrap.sql',status:404}
];

export async function checkPublicLaunch({fetchImpl=fetch,publicOrigin=PUBLIC,gatewayOrigin=GATEWAY,report=console.log}={}){
  let failures=0;
  for(const item of checks){
    const origin=item.origin==='public'?publicOrigin:gatewayOrigin;
    try{
      const response=await fetchImpl(origin+item.path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
      let ok=response.status===item.status;
      if(item.origin!=='public')ok=ok&&/\bno-store\b/i.test(response.headers.get('cache-control')||'');
      if(item.retry)ok=ok&&response.headers.get('retry-after')==='60';
      if(item.body)ok=ok&&item.body.test((await response.text()).slice(0,20000));
      if(item.json){
        const data=await response.json();
        ok=ok&&data?.ownerVerified===false;
      }
      report((ok?'PASS':'FAIL')+' '+item.name+' HTTP '+response.status);
      if(!ok)failures++;
    }catch(error){
      report('FAIL '+item.name+' '+error.message);
      failures++;
    }
  }
  report('Read-only prelaunch diagnostic. Passing is NOT proof of owner/player authentication, recovery, browser behavior, or authorization to launch.');
  return {passed:checks.length-failures,failed:failures,total:checks.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  checkPublicLaunch().then(result=>{if(result.failed)process.exitCode=1;}).catch(error=>{console.error(error);process.exitCode=1;});
}
