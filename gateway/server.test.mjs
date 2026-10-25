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
