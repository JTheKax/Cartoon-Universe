import {test,expect} from '@playwright/test';
test('review preview responds with a usable document',async({page})=>{
 const response=await page.goto('/',{waitUntil:'domcontentloaded'});
 expect(response,'preview should return an HTTP response').not.toBeNull();
 expect(response.status()).toBeLessThan(500);
 await expect(page.locator('body')).toBeVisible();
 const title=await page.title();
 expect(title.length).toBeGreaterThan(0);
});
test('public preview does not expose owner-only controls to anonymous visitors',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-owner-only]:visible')).toHaveCount(0);
});
test('preview screenshot and navigation smoke test',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await page.screenshot({path:'test-results/preview-home.png',fullPage:true});
 const links=page.locator('a[href]');
 expect(await links.count()).toBeGreaterThan(0);
});
