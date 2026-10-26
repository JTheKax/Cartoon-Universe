import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createMaintenanceControlHandler} from './maintenance-control-handler.mjs';

const origin='https://cartoon-universe-gateway.onrender.com';
const base={verifyOwner:async()=>({role:'owner',isAnonymous:false}),readState:async()=>({enabled:true,revision:1}),checkRouting:async()=>true,releaseApproved:async()=>true,validateCsrf:async()=>true,siteOrigin:origin};
async function invoke({method='POST',payload={requested:false,expectedRevision:1},headers={},dependencies={}}={}){
 const body=JSON.stringify(payload);
 const req=Readable.from([body]);req.method=method;
 req.headers={'origin':origin,'content-type':'application/json','content-length':String(Buffer.byteLength(body)),...headers};
 const response={status:null,headers:null,body:'',writeHead(code,h){this.status=code;this.headers=h},end(value){this.body=String(value||'')}};
 await createMaintenanceControlHandler({...base,...dependencies})(req,response);
 return {status:response.status,body:JSON.parse(response.body)};
}
test('verified owner sees read-only transition',async()=>{const r=await invoke();assert.equal(r.status,200);assert.equal(r.body.allowed,true);assert.equal(r.body.changed,false)});
test('rejects non-owner',async()=>assert.equal((await invoke({dependencies:{verifyOwner:async()=>({role:'player'})}})).status,403));
test('rejects bad origin',async()=>assert.equal((await invoke({headers:{origin:'https://attacker.invalid'}})).status,403));
test('rejects invalid CSRF',async()=>assert.equal((await invoke({dependencies:{validateCsrf:async()=>false}})).status,403));
test('rejects non-POST',async()=>assert.equal((await invoke({method:'GET'})).status,405));
test('rejects wrong content type',async()=>assert.equal((await invoke({headers:{'content-type':'text/plain'}})).status,415));
test('rejects oversized body declaration',async()=>assert.equal((await invoke({headers:{'content-length':'9999'}})).status,413));
test('rejects stale revision',async()=>assert.equal((await invoke({payload:{requested:false,expectedRevision:0}})).body.allowed,false));
test('rejects unapproved OFF',async()=>assert.equal((await invoke({dependencies:{releaseApproved:async()=>false}})).body.allowed,false));
test('fails closed when routing unavailable',async()=>assert.equal((await invoke({dependencies:{checkRouting:async()=>{throw Error('offline')}}})).status,503));
