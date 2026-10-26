// Actual verification UI and server; all identity/network boundaries are fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createCandidateServer} from '../../server/gateway-candidate.mjs';
const origin='https://cartoon-universe-gateway.onrender.com',project='https://gjfyemvcrgrthbrlqqnz.supabase.co';
const OWNER='00000000-0000-0000-0000-000000000002',PLAYER='00000000-0000-0000-0000-000000000001';
test('owner verification browser flow keeps passwords at Supabase and isolates its session',async t=>{
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});const owner=options.headers.Authorization==='Bearer owner-token';
  if(url.endsWith('/auth/v1/user'))return Response.json({id:owner?OWNER:PLAYER});
  if(url.includes('/owner_members?'))return Response.json(owner?[{user_id:OWNER}]:[]);
  if(url.endsWith('/auth/v1/logout?scope=local'))return new Response(null,{status:204});
  throw new Error('Unexpected upstream operation');
 };
 const server=createCandidateServer({origin,ownerVerification:{supabaseUrl:project,publishableKey:'sb_publishable_disposable_fixture_key'},fetchImpl});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 for(const identifier of ['owner@example.test','test_owner','player@example.test']){
  await t.test(identifier,async()=>{
   const context=await browser.newContext();const authRequests=[];
   try{
    await context.route('**/*',async route=>{
     const request=route.request(),url=new URL(request.url());
     if(url.origin===origin){
      assert.ok(!request.postData(),'Passwords/refresh tokens must never be posted to candidate');
      const response=await route.fetch({url:base+url.pathname+url.search,headers:await request.allHeaders(),maxRedirects:0});
      return route.fulfill({response});
     }
     if(url.origin===project){
      const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'apikey, content-type, authorization'};
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
      if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204,headers});
      const credentials=request.postDataJSON();authRequests.push({url:request.url(),credentials});
      assert.equal(credentials.password,'disposable-password');
      const owner=credentials.email==='owner@example.test'||credentials.username==='test_owner';
      return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({access_token:owner?'owner-token':'player-token',refresh_token:'never-send-this-to-candidate'})});
     }
     return route.abort();
    });
    const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/__maintenance/owner-signin');
    await page.locator('#identifier').fill(identifier);await page.locator('#password').fill('disposable-password');await page.locator('#verify').click();
    if(identifier!=='player@example.test'){
     await page.getByText('Owner sign-in verified. No arcade settings have changed.',{exact:true}).waitFor();
     assert.equal(await page.locator('#password').inputValue(),'');
     const cookie=(await context.cookies()).find(value=>value.name==='__Host-cu_owner_verify');assert.ok(cookie?.secure&&cookie?.httpOnly);assert.equal(cookie.sameSite,'Lax');
     assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
     assert.equal(await page.evaluate(async()=> (await fetch('/owner.html')).status),503);
     await page.locator('#clear').click();await page.getByText('Verification session cleared.',{exact:true}).waitFor();
     assert.equal((await context.cookies()).some(value=>value.name==='__Host-cu_owner_verify'),false);
    }else{await page.getByText('Owner access could not be verified.',{exact:true}).waitFor();assert.equal((await context.cookies()).some(value=>value.name==='__Host-cu_owner_verify'),false);}
    assert.equal(authRequests.length,1);assert.deepEqual(errors,[]);
   }finally{await context.close();}
  });
 }
 assert.ok(calls.filter(call=>call.options.method==='POST').every(call=>call.url===project+'/auth/v1/logout?scope=local'));
 assert.doesNotMatch(JSON.stringify(calls),/disposable-password|never-send-this-to-candidate/);
});
