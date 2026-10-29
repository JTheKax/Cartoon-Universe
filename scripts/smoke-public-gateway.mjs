// Read-only live anonymous smoke checks. Run only after the separate gateway is deployed.
// Usage: node scripts/smoke-public-gateway.mjs https://cartoon-universe-gateway.onrender.com
const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/smoke-public-gateway.mjs https://<gateway-host>');
const url=new URL(input);
if(url.protocol!=='https:'||url.origin!==url.href.replace(/\/$/,'')||url.username||url.password)
 throw new Error('Specify a canonical HTTPS gateway origin, without path or credentials.');
const checks=[
 ['GET','/__maintenance/health',200],
 ['GET','/__maintenance/owner-signin',200],
 ['GET','/__maintenance/password-recovery',200],
 ['GET','/',503],
 ['GET','/static/theater.html',503],
 ['GET','/coin-wallet.html',503],
 ['GET','/owner.html',403],
 ['GET','/__maintenance/arcade/',403],
 ['GET','/server/public-launch-gateway.mjs',404],
 ['GET','/sql/tests/ci_bootstrap.sql',404],
 ['POST','/owner.html',405]
];
let failed=false;
for(const [method,path,expected] of checks){
 try{
  const response=await fetch(url.origin+path,{method,redirect:'manual',signal:AbortSignal.timeout(15000)});
  const okay=response.status===expected;
  console.log((okay?'PASS':'FAIL')+' '+method+' '+path+' HTTP '+response.status+' (expected '+expected+')');
  if(!okay)failed=true;
 }catch(error){failed=true;console.log('FAIL '+method+' '+path+' '+error.message);}
}
if(failed)process.exitCode=1;
