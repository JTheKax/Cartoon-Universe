const { chromium } = require('playwright');
const fs = require('node:fs');
const base = 'http://127.0.0.1:8765';
const errors = [];
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const page = await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror', err => errors.push(err.message));
  const catalog = JSON.parse(fs.readFileSync('sticker-catalog.json','utf8'));
  const subs = catalog.series.find(s=>s.id==='cartoons').subseries;
  for(const id of ['mucha-lucha','camp-lazlo','class-of-3000']){
   const sub = subs.find(s=>s.id===id);
   if(!sub)throw new Error('Missing subseries '+id);
   await page.goto(base+'/shop-collect-series.html?set=cartoons&subseries='+id);
   await page.locator('#set-title').getByText(sub.name,{exact:true}).waitFor();
   const logo=page.locator('.set-head .official-series-logo');
   await logo.waitFor({state:'visible',timeout:15000});
   const loaded=await logo.evaluate(img=>img.complete && img.naturalWidth>0);
   if(!loaded)throw new Error('Logo failed to load for '+id);
   if(sub.logoUrl){
    const expected=new URL(sub.logoUrl).pathname.split('/').pop();
    if(!(await logo.getAttribute('src')).includes(expected))throw new Error('Unexpected logo for '+id);
   }
   fs.mkdirSync('test-results',{recursive:true});
   await page.screenshot({path:'test-results/'+id+'.png',fullPage:true});
  }
  await page.goto(base+'/shop-collect-series.html?set=cartoons');
  await page.locator('.sub-card').first().waitFor();
  const count=await page.locator('.sub-card').count();
  if(count!==subs.length)throw new Error('Expected '+subs.length+' cartoon cards, got '+count);
  if(errors.length)throw new Error('Browser JavaScript errors: '+errors.join(' | '));
  console.log('PASS: '+count+' subseries; three uploaded logos loaded; no JS errors.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
