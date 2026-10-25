// Real Chromium + real gateway/HTML/bridge; Supabase identity is simulated.
// This suite never creates accounts or contacts Supabase/production.
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createGateway,stagingConfig} from '../../server/maintenance-gateway.mjs';

const OWNER='00000000-0000-0000-0000-000000000002';
const PLAYER='00000000-0000-0000-0000-000000000001';
const mockSDK=`
const listeners=new Set();
const session=()=>JSON.parse(localStorage.getItem('ci-session')||'null');
const user=()=>session()?.user||null;
function emit(event){for(const cb of listeners)cb(event,session());}
export function createClient(){return {
 auth:{
  getUser:async()=>({data:{user:user()},error:null}),
  onAuthStateChange(cb){listeners.add(cb);queueMicrotask(()=>cb('INITIAL_SESSION',session()));return {data:{subscription:{unsubscribe(){listeners.delete(cb);}}}};},
  async signInWithPassword({email,password}){
   if(password!=='disposable-password')return {error:{message:'Invalid credentials'}};
   const owner=email==='owner@example.test';
   localStorage.setItem('ci-session',JSON.stringify({access_token:owner?'owner-token':'player-token',user:{id:owner?'${OWNER}':'${PLAYER}',email}}));
   emit('SIGNED_IN');return {data:{session:session(),user:user()},error:null};
  },
  async signOut(){localStorage.removeItem('ci-session');emit('SIGNED_OUT');return {error:null};}
 },
 from(table){
  const result=()=>({error:null,count:2,data:table==='owner_members'?(session()?.access_token==='owner-token'?{user_id:user().id}:null):table==='profiles'?{username:'test_user',display_name:'Test User',avatar_color:'#ff4ca8',presence_mode:'offline'}:table==='site_maintenance'?{id:true,enabled:true,message:'Simulated maintenance'}:{balance:100}});
  const query={select(){return this;},eq(){return this;},maybeSingle:async()=>result(),single:async()=>result(),then(resolve){return Promise.resolve(result()).then(resolve);}};
  return query;
 }
};}
`;

test('browser sign-in and navigation against simulated staging identities',async t=>{
 const config=stagingConfig({STAGING_SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',STAGING_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_disposable_fixture',STAGING_SITE_ORIGIN:'http://127.0.0.1'});
 const state={enabled:true,owner:true,down:false,time:Date.now()};
 const fetchImpl=async(url,options)=>{
  if(state.down)throw new Error('Simulated outage');
  const token=options.headers.Authorization;
  if(url.endsWith('/auth/v1/user'))return Response.json({id:token==='Bearer owner-token'?OWNER:PLAYER});
  if(url.includes('/owner_members?'))return Response.json(token==='Bearer owner-token'&&state.owner?[{user_id:OWNER}]:[]);
  if(url.includes('/site_maintenance?'))return Response.json([{enabled:state.enabled,message:'Simulated maintenance'}]);
  throw new Error('Unexpected endpoint');
 };
 const server=createGateway({config,fetchImpl,now:()=>state.time});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;config.siteOrigin=base;
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 async function pageFixture(t){
  const context=await browser.newContext();t.after(()=>context.close());
  await context.route('**/*',route=>{
   const url=route.request().url();
   if(url==='https://esm.sh/@supabase/supabase-js@2')return route.fulfill({contentType:'text/javascript',body:mockSDK});
   if(url.startsWith(base+'/'))return route.continue();
   return route.abort(); // No external request, including Supabase, can leave this browser.
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  t.after(()=>assert.deepEqual(errors,[],'Uncaught browser errors'));
  return {context,page};
 }
 async function login(page,email){
  assert.equal((await page.goto(base+'/login.html')).status(),200);
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill('disposable-password');
  await page.locator('#login button[type=submit]').click();
 }
 await t.test('owner sign-in unlocks dashboard; logout blocks it again',async t=>{
  const {context,page}=await pageFixture(t);
  await login(page,'owner@example.test');
  const link=page.getByRole('link',{name:'Open staging owner dashboard'});await link.waitFor({state:'visible'});
  const cookie=(await context.cookies()).find(c=>c.name==='cu_staging_owner');assert.ok(cookie?.httpOnly);assert.equal(cookie.sameSite,'Strict');
  await link.click();await page.locator('#owner-content').waitFor({state:'visible'});
  await page.goto(base+'/login.html');await page.getByRole('link',{name:'Open staging owner dashboard'}).waitFor({state:'visible'});
  await page.locator('#logout').click();
  await page.getByText('Staging gateway: sign in as owner to unlock protected pages.',{exact:true}).waitFor();
  assert.equal((await page.goto(base+'/owner.html')).status(),503);
 });
 await t.test('player sign-in cannot unlock protected navigation',async t=>{
  const {page}=await pageFixture(t);await login(page,'player@example.test');
  await page.locator('#account-panel').waitFor({state:'visible'});
  await page.getByText('Staging gateway: sign in as owner to unlock protected pages.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Open staging owner dashboard'}).isVisible(),false);
  assert.equal((await page.goto(base+'/coin-wallet.html')).status(),503);
 });
 await t.test('expired owner access returns to reachable sign-in',async t=>{
  const {page}=await pageFixture(t);await login(page,'owner@example.test');
  await page.getByRole('link',{name:'Open staging owner dashboard'}).waitFor({state:'visible'});
  state.time+=300001;
  assert.equal((await page.goto(base+'/owner.html')).status(),503);
  await page.getByRole('link',{name:'Owner sign-in',exact:true}).click();
  await page.getByRole('link',{name:'Open staging owner dashboard'}).waitFor({state:'visible'});
 });
 await t.test('maintenance OFF restores player navigation; upstream outage keeps sign-in reachable',async t=>{
  const {page}=await pageFixture(t);state.enabled=false;
  assert.equal((await page.goto(base+'/')).status(),200);
  state.down=true;
  assert.equal((await page.goto(base+'/')).status(),503);
  assert.equal((await page.goto(base+'/login.html')).status(),200);
  await page.locator('#login-email').waitFor({state:'visible'});
  state.down=false;state.enabled=true;
 });
});
