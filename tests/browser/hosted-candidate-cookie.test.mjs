// Live anonymous browser smoke; never sends owner/player credentials or mutates Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://cartoon-universe-gateway.onrender.com';
const pause=()=>new Promise(resolve=>setTimeout(resolve,1000));
test('live public gateway serves arcade and redirects anonymous owner access safely',{timeout:120000},async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext();
 try{
  const page=await context.newPage();
  const response=await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response.status(),200,'The live homepage must be available after the public cutover');
  assert.match(await page.title(),/Cartoon Universe/i);
  const owner=await context.request.get(origin+'/owner.html',{maxRedirects:0});
  assert.equal(owner.status(),302);
  assert.match(owner.headers().location||'',/^\/__maintenance\/owner-signin\?next=/);
  const protectedArcade=await context.request.get(origin+'/__maintenance/arcade/',{maxRedirects:0});
  assert.equal(protectedArcade.status(),302);
  const source=await context.request.get(origin+'/server/public-launch-gateway.mjs');
  assert.equal(source.status(),404);
  assert.equal((await context.cookies()).some(c=>c.name==='__Host-cu_owner_verify'),false);
 }finally{await browser.close();}
});
test('hosted owner verification page is available without sending production credentials',{timeout:180000},async()=>{
 const browser=await chromium.launch({headless:true});const context=await browser.newContext();
 try{
  const deadline=Date.now()+120000;
  while(true){
   try{const response=await context.request.get(origin+'/__maintenance/owner-signin',{timeout:15000});if(response.status()===200&&(await response.text()).includes('Verify owner sign-in'))break;}catch{}
   if(Date.now()>=deadline)throw new Error('Hosted owner verification page did not become available');await pause();
  }
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();await page.goto(origin+'/__maintenance/owner-signin');
  await page.locator('#identifier').fill('invalid username');await page.locator('#password').fill('invalid-input-only');await page.locator('#verify').click();
  await page.getByText('Enter a valid username or email.',{exact:true}).waitFor();assert.equal(await page.locator('#password').inputValue(),'');
  assert.equal((await page.evaluate(async()=> (await fetch('/__maintenance/owner-status')).json())).ownerVerified,false);
 }finally{await browser.close();}
});
