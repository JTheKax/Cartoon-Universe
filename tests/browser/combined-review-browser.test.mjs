// Isolated combined-site browser smoke: real protected routes, simulated owner identity.
// No Supabase or public production network requests, writes, or paid services.
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFileSync} from 'node:fs';
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
 assert.equal((await anonymousPage.goto(origin+'/__maintenance/arcade/shop-watch-movies.html')).status(),503);
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
 // Exercise every reviewed shop destination, not just the top-level Watch/Collect tabs.
 // The gateway allowlist is the same contract used to construct the isolated bundle.
 const gatewaySource=readFileSync(new URL('../../server/gateway-candidate.mjs',import.meta.url),'utf8');
 const allowlist=gatewaySource.match(/const ARCADE_FILES=new Set\(\[([\s\S]*?)\]\);/)?.[1];
 assert.ok(allowlist,'Owner gateway must declare an explicit reviewed asset allowlist');
 const shopPages=[...allowlist.matchAll(/'([^']+)'/g)].map(match=>match[1]).filter(name=>/^shop-[a-z-]+\.html$/.test(name));
 assert.ok(shopPages.length>=25,'Expected the combined release to include its full shop navigation');
 for(const name of shopPages){
  const response=await page.goto(origin+'/__maintenance/arcade/'+name);
  assert.equal(response.status(),200,'Verified owner must reach '+name);
  assert.match(response.headers()['content-type']||'',/text\/html/,'Shop page must be served as HTML: '+name);
 }
 await page.goto(origin+'/__maintenance/arcade/static/theater.html');
 // The owner removed the demonstration DVD cases: the built-in shelf now has
 // exactly one Dark Side collection. User-created browser-local drafts are separate.
 assert.equal(await page.locator('#dvd-shelf .dvd-case').count(),1,'Only the requested Dark Side DVD case should be preloaded');
 const darkCase=page.locator('#dvd-shelf .dark-side-dvd');
 assert.equal(await darkCase.getAttribute('data-title'),'Dark Side of the Ring');
 await darkCase.click();
 assert.equal(await page.locator('#dark-side-episodes').isVisible(),true,'Dark Side case should open its episode collection');
 assert.equal(await darkCase.getAttribute('aria-expanded'),'true');
 assert.match(await page.locator('#dark-side-episode-status').textContent(),/No episodes added yet/);
 // Exercise season sorting and browser-local episode saving without contacting YouTube.
 await page.locator('#dark-side-episode-season').fill('2');
 await page.locator('#dark-side-episode-number').fill('3');
 await page.locator('#dark-side-episode-title').fill('Later season fixture');
 await page.locator('#dark-side-episode-url').fill('https://www.youtube.com/watch?v=AaBbCcDdEe1');
 await page.locator('#dark-side-episode-form button[type="submit"]').click();
 await page.locator('#dark-side-episode-season').fill('1');
 await page.locator('#dark-side-episode-number').fill('2');
 await page.locator('#dark-side-episode-title').fill('Earlier season fixture');
 await page.locator('#dark-side-episode-url').fill('https://www.youtube.com/watch?v=ZzYyXxWwVv2');
 await page.locator('#dark-side-episode-form button[type="submit"]').click();
 assert.deepEqual(await page.locator('#dark-side-episode-list .dark-side-season').allTextContents(),['Season 1','Season 2']);
 assert.equal(await page.locator('#dark-side-episode-list .dark-side-episode-row').count(),2);
 assert.match(await page.locator('#dark-side-episode-status').textContent(),/2 episode\(s\) across 2 season\(s\)/);
 await page.reload();
 await page.locator('#dvd-shelf .dark-side-dvd').click();
 assert.equal(await page.locator('#dark-side-episode-list .dark-side-episode-row').count(),2,'Episode drafts should survive reload in this browser');
 const catalog=await page.evaluate(async()=>{
  const response=await fetch('/__maintenance/arcade/sticker-catalog.json');
  return {status:response.status,type:response.headers.get('content-type'),data:await response.json()};
 });
 assert.equal(catalog.status,200);
 assert.match(catalog.type,/application\/json/);
 assert.ok(Array.isArray(catalog.data.stickers));
});
