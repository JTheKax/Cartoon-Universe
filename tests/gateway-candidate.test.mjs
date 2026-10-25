import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createCandidateServer} from '../server/gateway-candidate.mjs';
async function fixture(t){const server=createCandidateServer();server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));return 'http://127.0.0.1:'+server.address().port;}
test('candidate health is reachable but all application paths remain setup-only',async t=>{
 const base=await fixture(t);assert.equal((await fetch(base+'/__maintenance/health')).status,200);
 for(const path of ['/','/owner.html','/config.js','/coin-wallet.html','/server/gateway-candidate.mjs']){
  const response=await fetch(base+path);assert.equal(response.status,503,path);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.text();assert.match(body,/This address is being prepared/);assert.match(body,/Arcade access is unavailable from this setup page/);assert.doesNotMatch(body,/Continue to the current arcade|href=["']https:\/\/cartoon-universe-3\.onrender\.com/);assert.doesNotMatch(body,/sb_publishable_|sb_secret_|createClient/);
 }
});
test('setup page only offers owner login when owner verification is configured',async t=>{
 const base=await fixture(t);
 const body=await (await fetch(base+'/')).text();
 assert.doesNotMatch(body,/Owner Login|__maintenance\\/owner-signin/);
 const source=await import('node:fs/promises');
 const gateway=await source.readFile(fileURLToPath(new URL('../server/gateway-candidate.mjs',import.meta.url)),'utf8');
 assert.match(gateway,/verifyOwner\\?'<p><a href=/);
 assert.match(gateway,/__maintenance\\/owner-signin/);
});
test('candidate has no write endpoint and HEAD has no response body',async t=>{
 const base=await fixture(t);assert.equal((await fetch(base+'/__maintenance/session',{method:'POST'})).status,405);
 const head=await fetch(base+'/',{method:'HEAD'});assert.equal(head.status,503);assert.equal(await head.text(),'');
});
test('candidate CLI cannot launch in production-enabled mode',()=>{
 const path=fileURLToPath(new URL('../server/gateway-candidate.mjs',import.meta.url));
 const result=spawnSync(process.execPath,[path],{env:{GATEWAY_CANDIDATE_MODE:'true',PRODUCTION_GATEWAY_ENABLED:'true'},encoding:'utf8',timeout:5000});assert.equal(result.status,1);assert.match(result.stderr,/Only isolated candidate mode/);assert.doesNotMatch(result.stdout,/listening/);
});
test('probe uses secure host cookies, expires, and never authorizes application pages',async t=>{
 let time=1000;const origin='https://cartoon-universe-gateway.onrender.com';
 const server=createCandidateServer({origin,now:()=>time});server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/__maintenance/cookie-probe',{method:'POST',headers:{Origin:'https://other.example'}})).status,403);
 const response=await fetch(base+'/__maintenance/cookie-probe',{method:'POST',headers:{Origin:origin}});assert.equal(response.status,204);
 const header=response.headers.get('set-cookie');assert.match(header,/^__Host-cu_probe=[0-9a-f]{48}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=60; Secure$/);
 const headers={Cookie:header.split(';')[0]};
 assert.deepEqual(await (await fetch(base+'/__maintenance/cookie-check',{headers})).json(),{received:true,authority:'none'});
 assert.equal((await fetch(base+'/owner.html',{headers})).status,503);
 time+=60001;assert.equal((await (await fetch(base+'/__maintenance/cookie-check',{headers})).json()).received,false);
 const cleared=await fetch(base+'/__maintenance/cookie-probe',{method:'DELETE',headers:{...headers,Origin:origin}});assert.match(cleared.headers.get('set-cookie'),/Max-Age=0; Secure$/);
});
