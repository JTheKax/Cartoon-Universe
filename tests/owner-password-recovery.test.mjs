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
 assert.match(client,/resetPasswordForEmail/);
 assert.match(client,/location\.origin\+'\/__maintenance\/password-recovery'/);
 assert.match(client,/requestForm\.hidden=true/);
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
 assert.match(login.headers.get('content-security-policy'),/script-src 'self' https:\/\/esm\.sh/);
 assert.doesNotMatch(login.headers.get('content-security-policy'),/unsafe-inline/);
});


test('owner verification persists the Supabase session for the existing Owner Dashboard',()=>{
 const browser=readFileSync(new URL('../server/owner-verification-client.js',import.meta.url),'utf8');
 assert.match(browser,/createClient/);
 assert.match(browser,/persistSession:true/);
 assert.match(browser,/signInWithPassword/);
 assert.match(browser,/auth\.setSession/);
 assert.match(browser,/auth\.signOut/);
 assert.match(browser,/verify-session/);
 assert.doesNotMatch(browser,/service_role|sb_secret_/);
});


test('owner recovery page can request a reset email while public maintenance remains active',async t=>{
 const {once}=await import('node:events');
 const {createCandidateServer}=await import('../server/gateway-candidate.mjs');
 const server=createCandidateServer({origin:'https://cartoon-universe-gateway.onrender.com',ownerVerification:{supabaseUrl:'https://gjfyemvcrgrthbrlqqnz.supabase.co',publishableKey:'sb_publishable_disposable_fixture_key'}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)}));
 const base='http://127.0.0.1:'+server.address().port;
 const response=await fetch(base+'/__maintenance/password-recovery');
 assert.equal(response.status,200);
 const html=await response.text();
 assert.match(html,/id="recovery-request-form"/);
 assert.match(html,/id="recovery-email" type="email"/);
 assert.match(html,/id="recovery-form" hidden/);
 assert.equal((await fetch(base+'/__maintenance/password-recovery.js')).status,200);
 assert.equal((await fetch(base+'/__maintenance/arcade/owner.html')).status,503);
});


test('reset email requests use only the fixed gateway redirect and do not enumerate accounts',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=client.replace(/^import .*;\s*$/gm,'');
 const handlers={};const calls=[];
 const button={disabled:false};
 const requestForm={hidden:false,addEventListener:(name,handler)=>{handlers[name]=handler;},querySelector:()=>button};
 const email={value:'owner@example.com'};
 const status={textContent:''};
 const fields={'#recovery-status':status,'#recovery-request-form':requestForm,'#recovery-email':email,'#recovery-form':{hidden:true},'#password-new':{value:''},'#password-confirm':{value:''}};
 const auth={resetPasswordForEmail:async(address,options)=>{calls.push({address,options});return {error:null};}};
 const createClient=()=>({auth});
 const location={origin:'https://cartoon-universe-gateway.onrender.com',pathname:'/__maintenance/password-recovery',search:'',hash:''};
 const history={replaceState:()=>{}};
 await runInNewContext('(async()=>{'+source+'})()',{createClient,SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_KEY:'sb_publishable_fixture',document:{querySelector:selector=>fields[selector]},location,history});
 await handlers.submit({preventDefault(){}});
 assert.deepEqual(calls,[{address:'owner@example.com',options:{redirectTo:'https://cartoon-universe-gateway.onrender.com/__maintenance/password-recovery'}}]);
 assert.match(status.textContent,/If this email belongs to an account/);
 assert.equal(email.value,'');assert.equal(button.disabled,false);
});
