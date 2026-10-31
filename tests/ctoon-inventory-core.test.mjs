import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCtoonCollection} from '../ctoon-inventory-core.mjs';
const catalog=[{id:'a',name:'First',series:'Naruto',category:'Anime'},{id:'b',name:'Second',series:'Futurama',category:'Cartoons'}];
test('tracks owned, need, copies and duplicates',()=>{
 const result=buildCtoonCollection(catalog,[{ctoon_id:'a',quantity:3}]);
 assert.deepEqual(result.totals,{unique:2,owned:1,needed:1,copies:3,duplicates:2});
 assert.deepEqual(result.items.map(x=>x.status),['Owned','Need']);
});
test('filters by series and ownership',()=>{
 const result=buildCtoonCollection(catalog,[{ctoon_id:'a',quantity:1}],{query:'futurama',status:'Need'});
 assert.deepEqual(result.items.map(x=>x.id),['b']);
});
test('rejects malformed quantities and ignores unknown IDs',()=>{
 const result=buildCtoonCollection(catalog,[{ctoon_id:'a',quantity:-1},{ctoon_id:'b',quantity:2},{ctoon_id:'unknown',quantity:9}]);
 assert.equal(result.totals.copies,2);
});
test('catalog IDs are deduplicated',()=>{
 assert.equal(buildCtoonCollection([...catalog,catalog[0]],[]).totals.unique,2);
});
