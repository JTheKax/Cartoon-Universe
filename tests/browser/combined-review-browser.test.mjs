// Isolated combined-site browser smoke: real protected routes, simulated owner identity.
// No Supabase or public production network requests, writes, or paid services.
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createCandidateServer} from '../../server/gateway-candidate.mjs';

const origin='https://cartoon-universe-gateway.onrender.com';
const project='https://gjfyemvcrgrthbrlqqnz.supabase.co';
const ownerId='00000000-0000-0000-0000-000000000002';

test('combined arcade navigation, owner dashboard shell, theater DVD cases and anonymous denial',async t=>{
 const fetchImpl=async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:ownerId});
  if(url.includes('/owner_members?'))return Response.json([{user_id:ownerId}]);
  throw new Error('Unexpected external request in isolated test');
 };
 const server=createCandidateServer({origin,ownerVerification:{supabaseUrl:project,publishableKey:'sb_publishable_disposable_fixture_key'},fetchImpl});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)}));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 async function fixture(){
  const context=await browser.newContext();
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin===origin){
    const response=await route.fetch({url:base+url.pathname+url.search,headers:await route.request().allHeaders(),maxRedirects:0});
    return route.fulfill({response});
   }
   return route.abort(); // No production Supabase, external scripts, or media calls.
  });
  return context;
 }
 const anon=await fixture();t.after(()=>anon.close());
 const anonymousPage=await anon.newPage();
 assert.equal((await anonymousPage.goto(origin+'/__maintenance/arcade/')).status(),503);
 assert.equal((await anonymousPage.goto(origin+'/__maintenance/arcade/owner.html')).status(),503);
 assert.equal((await anonymousPage.goto(origin+'/__maintenance/arcade/sticker-catalog.json')).status(),503);
 const context=await fixture();t.after(()=>context.close());
 const page=await context.newPage();
 assert.equal((await page.goto(origin+'/__maintenance/owner-signin')).status(),200);
 const verified=await page.evaluate(async()=>{
  const response=await fetch('/__maintenance/verify-session',{method:'POST',headers:{Authorization:'Bearer owner-token'},credentials:'same-origin'});
  return response.status;
 });
 assert.equal(verified,200);
 for(const path of ['', 'shop-watch.html', 'shop-collect.html', 'owner.html', 'static/theater.html']){
  const response=await page.goto(origin+'/__maintenance/arcade/'+path);
  assert.equal(response.status(),200,'Verified owner should reach '+(path||'homepage'));
 }
 assert.ok(await page.locator('#dvd-shelf .dvd-case').count()>=4,'Theater must show custom DVD cases');
 await page.locator('#dvd-shelf .dvd-case').first().click();
 assert.match(await page.locator('#dvd-selection').textContent(),/demo DVD case/i);
 const catalog=await page.evaluate(async()=>{
  const response=await fetch('/__maintenance/arcade/sticker-catalog.json');
  return {status:response.status,type:response.headers.get('content-type'),data:await response.json()};
 });
 assert.equal(catalog.status,200);
 assert.match(catalog.type,/application\/json/);
 assert.ok(Array.isArray(catalog.data.stickers));
});
