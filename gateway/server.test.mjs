import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from './server.mjs';
function response() {
 return {status:null,headers:null,body:'',writeHead(status,headers){this.status=status;this.headers=headers;},write(chunk){this.body+=chunk.toString();},end(chunk=''){this.body+=chunk.toString();}};
}
test('maintenance ON returns 503 without owner access',async()=>{
 const res=response();
 await createHandler({getSettings:async()=>({enabled:true,message:'Back soon'}),isOwner:async()=>false})({url:'/index.html',headers:{},method:'GET'},res);
 assert.equal(res.status,503);assert.match(res.body,/Back soon/);assert.equal(res.headers['Retry-After'],'300');
});
test('settings failures fail closed',async()=>{
 const res=response();
 await createHandler({getSettings:async()=>{throw Error('offline')}})({url:'/',headers:{},method:'GET'},res);
 assert.equal(res.status,503);
});
test('health endpoint responds',async()=>{
 const res=response();
 await createHandler()({url:'/__gateway/health',headers:{},method:'GET'},res);
 assert.equal(res.status,200);
});

test('maintenance blocks direct assets and HEAD requests',async()=>{
 for(const [url,method] of [['/index.html','GET'],['/owner.html','GET'],['/styles.css','GET'],['/games/retro.html','GET'],['/index.html','HEAD']]){
  const res=response();
  await createHandler({getSettings:async()=>({enabled:true,message:'Offline'}),isOwner:async()=>false})({url,method,headers:{}},res);
  assert.equal(res.status,503,url);assert.equal(res.headers['Cache-Control'],'no-store, private');
  if(method==='HEAD')assert.equal(res.body,'');
 }
});
test('untrusted or expired owner access does not bypass maintenance',async()=>{
 const res=response();
 await createHandler({getSettings:async()=>({enabled:true,message:'Offline'}),isOwner:async()=>false})({url:'/',method:'GET',headers:{cookie:'cu_owner_access=expired'}},res);
 assert.equal(res.status,503);
});
test('maintenance escapes owner message HTML',async()=>{
 const res=response();
 await createHandler({getSettings:async()=>({enabled:true,message:'<script>alert(1)</script>'}),isOwner:async()=>false})({url:'/',method:'GET',headers:{}},res);
 assert.equal(res.status,503);assert.doesNotMatch(res.body,/<script>/);assert.match(res.body,/&lt;script&gt;/);
});
test('OFF proxies content and ON owner bypass proxies content',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response('arcade online',{status:200,headers:{'content-type':'text/plain'}});
 try {
  for(const [enabled,access] of [[false,false],[true,true]]){
   const res=response();
   await createHandler({getSettings:async()=>({enabled}),isOwner:async()=>access})({url:'/index.html',method:'GET',headers:{cookie:'cu_owner_access=test'}},res);
   assert.equal(res.status,200);assert.equal(res.body,'arcade online');
  }
 } finally {globalThis.fetch=originalFetch;}
});
