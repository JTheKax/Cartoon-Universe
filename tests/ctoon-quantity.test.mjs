import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCtoonCollection} from '../src/ctoon-collection.js';

const catalog=[{id:'a',series:'Anime',title:'A'},{id:'b',series:'Anime',title:'B'}];
function client(user,rows=[]){
 return {auth:{getUser:async()=>({data:{user},error:null})},
 from(table){
  const query={
   select(){return this},
   eq(field,value){if(table==='ctoon_sticker_ownership'&&field==='user_id')assert.equal(value,user.id);return this},
   order(){return this},
   then(resolve,reject){return Promise.resolve({data:table==='ctoon_sticker_catalog'?catalog:rows,error:null}).then(resolve,reject)}
  };return query;
 }};
}
test('quantities, duplicates and completion are computed per player',async()=>{
 const result=await loadCtoonCollection(client({id:'player-1'},[{sticker_id:'a',quantity:3}]));
 assert.equal(result.ownedCount,1);
 assert.equal(result.needCount,1);
 assert.equal(result.totalCopies,3);
 assert.equal(result.duplicateCount,2);
 assert.equal(result.completionPercent,50);
 assert.deepEqual(result.items.map(x=>x.quantity),[3,0]);
});
test('anonymous catalog never loads ownership',async()=>{
 const result=await loadCtoonCollection(client(null));
 assert.equal(result.authenticated,false);
 assert.equal(result.totalCopies,0);
 assert.equal(result.needCount,2);
});
