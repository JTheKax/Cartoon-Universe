import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPublicLaunch} from '../scripts/check-public-launch.mjs';

function responses(overrides={}){
  const fetchImpl=async input=>{
    const url=new URL(input);
    const publicSite=url.hostname==='cartoon-universe-3.onrender.com';
    const path=url.pathname;
    const defaults={
      '/__maintenance/health':[200,'Public gateway process running; not a launch-readiness assertion'],
      '/__maintenance/owner-signin':[200,'<h1>Verify owner sign-in</h1>'],
      '/__maintenance/password-recovery':[200,'<h1>Reset your Cartoon Universe password</h1>'],
      '/__maintenance/owner-status':[200,'{"ownerVerified":false}'],
      '/':[503,'<h1>Under Maintenance</h1>'],
      '/coin-wallet.html':[503,'<h1>Under Maintenance</h1>'],
      '/static/theater.html':[503,'<h1>Under Maintenance</h1>'],
      '/owner.html':[403,'Owner verification required'],
      '/__maintenance/arcade/':[403,'Owner verification required'],
      '/server/public-launch-gateway.mjs':[404,'Not found'],
      '/sql/tests/ci_bootstrap.sql':[404,'Not found']
    };
    const key=(publicSite?'public:':'gateway:')+path;
    const [status,body]=overrides[key]||(publicSite?[200,'Cartoon Universe is under maintenance']:defaults[path]||[404,'Not found']);
    return new Response(body,{status,headers:publicSite?{}:{'cache-control':'no-store',...(status===503?{'retry-after':'60'}:{})}});
  };
  return fetchImpl;
}
async function run(overrides){
  const output=[];
  const result=await checkPublicLaunch({fetchImpl:responses(overrides),report:line=>output.push(line)});
  return {result,output};
}
test('separate production gateway, maintenance and anonymous restrictions pass diagnostic',async()=>{
  const {result}=await run({});
  assert.deepEqual(result,{passed:12,failed:0,total:12});
});
test('old candidate gateway is not mistaken for the separate production gateway',async()=>{
  const {result,output}=await run({'gateway:/__maintenance/health':[200,'Gateway candidate setup running']});
  assert.ok(result.failed>0);
  assert.ok(output.some(line=>line.includes('FAIL separate production gateway')));
});
test('publicly exposed owner dashboard is a blocker',async()=>{
  const {result}=await run({'gateway:/owner.html':[200,'Owner dashboard']});
  assert.ok(result.failed>0);
});
test('maintenance turned off is a blocker before cutover approval',async()=>{
  const {result}=await run({'gateway:/':[200,'Welcome to Cartoon Universe']});
  assert.ok(result.failed>0);
});
test('an authenticated owner cookie in anonymous status is a blocker',async()=>{
  const {result}=await run({'gateway:/__maintenance/owner-status':[200,'{"ownerVerified":true}']});
  assert.ok(result.failed>0);
});
test('missing static maintenance holding page is a blocker',async()=>{
  const {result}=await run({'public:/':[200,'Full public arcade']});
  assert.ok(result.failed>0);
});
test('a failed network request is reported rather than treated as readiness',async()=>{
  const logs=[];
  const result=await checkPublicLaunch({fetchImpl:async()=>{throw new Error('offline');},report:line=>logs.push(line)});
  assert.equal(result.failed,result.total);
  assert.ok(logs.some(line=>line.includes('offline')));
});
