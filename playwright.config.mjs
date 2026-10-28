import {defineConfig} from '@playwright/test';
const baseURL=process.env.TEST_BASE_URL||'https://cartoon-universe-integrated-review.onrender.com';
const url=new URL(baseURL);
if(url.protocol!=='https:'||!url.hostname.endsWith('.onrender.com'))throw Error('Only HTTPS Render preview URLs are allowed');
export default defineConfig({
 testDir:'./tests/browser',timeout:30000,retries:1,workers:1,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL,headless:true,browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'}
});
