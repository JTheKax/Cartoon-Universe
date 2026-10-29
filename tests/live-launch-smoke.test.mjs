import test from 'node:test';
import assert from 'node:assert/strict';
import {runLaunchSmoke,GATEWAY,PUBLIC} from '../scripts/live-launch-smoke.mjs';
const silent=()=>{};
function fixture({overrides={}}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  const path=new URL(url).pathname;
  const isPublic=url.startsWith(PUBLIC);
  const defaultStatus=isPublic?302:path==='/owner.html'||path==='/owner-coin-adjustments.js'||path==='/__maintenance/arcade/'?302:path==='/server/public-launch-gateway.mjs'||path==='/review-owner-coin-adjustments.sql'?404:200;
  const status=overrides[url]??defaultStatus;
  const headers={};
  if(isPublic)headers.location=GATEWAY+'/';
  if(!isPublic&&status===302)headers.location='/__maintenance/owner-signin?next='+encodeURIComponent(path);
  return new Response(status===503?'Gateway temporarily unavailable':'Cartoon Universe',{status,headers});
 };
 return {fetchImpl,calls};
}
test('anonymous release gate passes redirect, public pages, owner denial and source 404s',async()=>{
 const {fetchImpl,calls}=fixture();
 const {results,failures}=await runLaunchSmoke({fetchImpl,log:silent,delay:async()=>{}});
 assert.equal(failures.length,0);
 assert.equal(results.length,18);
 assert.ok(calls.every(c=>c.options.method==='GET'&&c.options.redirect==='manual'));
 assert.ok(calls.every(c=>!('authorization' in c.options)&&!('body' in c.options)));
});
test('persistent gateway 503 blocks launch even if health works',async()=>{
 const {fetchImpl}=fixture({overrides:{[GATEWAY+'/']:503}});
 const {failures}=await runLaunchSmoke({fetchImpl,log:silent,delay:async()=>{}});
 assert.ok(failures.some(x=>x.label==='homepage'&&x.marker==='gateway-upstream-error'));
});
test('owner route exposure blocks launch',async()=>{
 const {fetchImpl}=fixture({overrides:{[GATEWAY+'/owner.html']:200}});
 const {failures}=await runLaunchSmoke({fetchImpl,log:silent,delay:async()=>{}});
 assert.ok(failures.some(x=>x.label==='owner dashboard'));
});
test('public static host must redirect to gateway',async()=>{
 const {fetchImpl}=fixture({overrides:{[PUBLIC+'/']:200}});
 const {failures}=await runLaunchSmoke({fetchImpl,log:silent,delay:async()=>{}});
 assert.ok(failures.some(x=>x.label==='public redirect'));
});
