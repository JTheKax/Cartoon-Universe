// Read-only launch smoke checks. No login, writes, or maintenance changes.
// Run: node scripts/check-public-launch.mjs
const checks=[
 ['public maintenance','https://cartoon-universe-3.onrender.com/'],
 ['gateway health','https://cartoon-universe-gateway.onrender.com/__maintenance/health'],
 ['gateway owner sign-in','https://cartoon-universe-gateway.onrender.com/__maintenance/owner-signin'],
 ['gateway owner status','https://cartoon-universe-gateway.onrender.com/__maintenance/owner-status'],
 ['integrated theater preview','https://cartoon-universe-integrated-review.onrender.com/static/theater.html']
];
let failed=false;
for(const [label,url] of checks){
 try{
  const res=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  const body=await res.text();
  const text=body.slice(0,20000);
  const ok=label==='public maintenance'?res.status===200&&/under maintenance/i.test(text):
   label==='gateway health'?res.status===200&&/Gateway candidate setup running/.test(text):
   label==='gateway owner sign-in'?res.status===200&&/Verify owner sign-in/.test(text):
   label==='gateway owner status'?res.status===200&&/ownerVerified/.test(text)&&/false/.test(text):
   res.status===200&&/Movie Library/.test(text);
  console.log((ok?'PASS':'FAIL')+' '+label+' HTTP '+res.status);
  if(!ok)failed=true;
 }catch(err){console.error('FAIL '+label+' '+err.message);failed=true;}
}
console.log('This is a prelaunch diagnostic only. Passing checks do not authorize disabling maintenance or launching.');
if(failed)process.exitCode=1;
