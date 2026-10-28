import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server/owner-verification.mjs',import.meta.url),'utf8');
const client=readFileSync(new URL('../server/password-recovery-client.js',import.meta.url),'utf8');
test('recovery remains outside arcade gate and uses separate public route',()=>{
 assert.match(server,/__maintenance\/password-recovery/);
 assert.match(server,/RECOVERY_HTML/);
 assert.match(server,/readFileSync\(new URL\('\.\/password-recovery-client\.js'/);
});
test('recovery accepts supported token formats and clears URL',()=>{
 assert.match(client,/verifyOtp/);
 assert.match(client,/exchangeCodeForSession/);
 assert.match(client,/setSession/);
 assert.match(client,/history\.replaceState/);
 assert.match(client,/updateUser/);
 assert.match(client,/password\.value=''/);
 assert.doesNotMatch(client,/service_role|maintenance_controls|coin_wallets/);
});

test('recovery page permits its SDK import without loosening owner sign-in CSP',async t=>{
 const {once}=await import('node:events');
 const {createCandidateServer}=await import('../server/gateway-candidate.mjs');
 const server=createCandidateServer({origin:'https://cartoon-universe-gateway.onrender.com',ownerVerification:{supabaseUrl:'https://gjfyemvcrgrthbrlqqnz.supabase.co',publishableKey:'sb_publishable_disposable_fixture_key'}});
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)}));
 const base='http://127.0.0.1:'+server.address().port;
 const recovery=await fetch(base+'/__maintenance/password-recovery');
 assert.equal(recovery.status,200);
 assert.match(recovery.headers.get('content-security-policy'),/script-src 'self' https:\/\/esm\.sh/);
 const login=await fetch(base+'/__maintenance/owner-signin');
 assert.equal(login.status,200);
 assert.match(login.headers.get('content-security-policy'),/script-src 'self';/);
 assert.doesNotMatch(login.headers.get('content-security-policy'),/esm\.sh/);
});
