// Public setup diagnostics only: no Supabase/account credentials or owner session.
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://cartoon-universe-gateway.onrender.com';
const pause=()=>new Promise(resolve=>setTimeout(resolve,1000));
test('hosted candidate proves Secure HttpOnly cookie round-trip without granting access',{timeout:180000},async()=>{
 const browser=await chromium.launch({headless:true});const context=await browser.newContext();
 try{
  const deadline=Date.now()+120000;
  while(true){
   let response;
   try{response=await context.request.post(origin+'/__maintenance/cookie-probe',{headers:{Origin:origin},timeout:15000});}
   catch(error){if(Date.now()>=deadline)throw error;await pause();continue;}
   if(response.status()===204)break;
   if(Date.now()>=deadline)throw new Error('Hosted candidate cookie probe did not become available');
   await pause();
  }
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(origin+'/',{timeout:60000});assert.equal(response.status(),503);assert.match(await page.textContent('main'),/This address is being prepared/);
  assert.equal(await page.evaluate(async()=> (await fetch('/__maintenance/cookie-probe',{method:'POST'})).status),204);
  const cookie=(await context.cookies()).find(value=>value.name==='__Host-cu_probe');
  assert.ok(cookie?.secure);assert.ok(cookie?.httpOnly);assert.equal(cookie.sameSite,'Strict');assert.equal(cookie.path,'/');
  assert.equal(await page.evaluate(()=>document.cookie.includes('__Host-cu_probe')),false);
  assert.deepEqual(await page.evaluate(async()=> (await fetch('/__maintenance/cookie-check')).json()),{received:true,authority:'none'});
  assert.equal((await context.request.get(origin+'/owner.html')).status(),503);
  assert.equal((await context.request.post(origin+'/__maintenance/cookie-probe',{headers:{Origin:'https://unapproved.example'}})).status(),403);
  assert.equal(await page.evaluate(async()=> (await fetch('/__maintenance/cookie-probe',{method:'DELETE'})).status),204);
  assert.deepEqual(await page.evaluate(async()=> (await fetch('/__maintenance/cookie-check')).json()),{received:false,authority:'none'});
  assert.equal((await context.cookies()).some(value=>value.name==='__Host-cu_probe'),false);
  assert.deepEqual(errors,[]);
 }finally{
  try{await context.request.delete(origin+'/__maintenance/cookie-probe',{headers:{Origin:origin},timeout:5000});}catch{}
  await browser.close();
 }
});
