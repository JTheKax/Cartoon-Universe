import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RARITIES,createStickerView,filterStickers,safeStickerArt,collectPagedRows} from '../sticker-collection-core.mjs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sets=[{id:'a',slug:'arcade-originals',title:'Arcade Originals'},{id:'b',slug:'space',title:'Space'}];
const stickers=[
 {id:'1',set_id:'a',name:'Pixel Hero',rarity:'Rare',image_path:'assets/stickers/pixel-hero.webp'},
 {id:'2',set_id:'a',name:'Boss',rarity:'Legendary',image_path:null},
 {id:'3',set_id:'b',name:'Star',rarity:'Common',image_path:null}
];
test('albums show unique progress and duplicate copies from mocked inventory',()=>{
 const model=createStickerView(sets,stickers,[{sticker_id:'1',quantity:3},{sticker_id:'3',quantity:1}]);
 assert.equal(model.totalOwned,2);
 assert.equal(model.totalCopies,4);
 assert.deepEqual(model.albums.map(a=>[a.slug,a.collected,a.total,a.duplicates]),
  [['arcade-originals',1,2,2],['space',1,1,0]]);
 assert.equal(model.catalog[0].rarity,'Legendary');
 assert.equal(model.catalog.find(s=>s.id==='2').quantity,0);
});
test('unknown, invalid or nonpositive inventory records do not create stickers',()=>{
 const model=createStickerView(sets,stickers,[
  {sticker_id:'missing',quantity:9},{sticker_id:'1',quantity:-1},
  {sticker_id:'1',quantity:'invalid'},{sticker_id:'3',quantity:0}]);
 assert.equal(model.totalCopies,0);
 assert.equal(model.totalOwned,0);
});
test('album, rarity and ownership filters compose',()=>{
 const {catalog}=createStickerView(sets,stickers,[{sticker_id:'1',quantity:2}]);
 assert.deepEqual(filterStickers(catalog,{album:'arcade-originals',rarity:'Rare',owned:'yes'}).map(s=>s.id),['1']);
 assert.deepEqual(filterStickers(catalog,{album:'arcade-originals',owned:'no'}).map(s=>s.id),['2']);
 assert.equal(RARITIES.length,6);
 assert.ok(RARITIES.includes('Prize Only'));
});
test('sticker art is restricted to local image assets',()=>{
 assert.equal(safeStickerArt('assets/stickers/originals/pixel.webp'),'assets/stickers/originals/pixel.webp');
 for(const path of ['https://example.org/image.png','/assets/stickers/a.png','assets/stickers/../../secret.png','assets/stickers/a.svg','assets/stickers/x.png?token=1','javascript:alert(1)','assets\\stickers\\x.png']){
  assert.equal(safeStickerArt(path),null,path);
 }
});
test('player page only reads authenticated inventory and never mutates it',()=>{
 const client=file('sticker-collection.js');
 assert.match(client,/auth\.getUser\(\)/);
 assert.match(client,/from\('player_stickers'\)\.select\('sticker_id,quantity'\)\.eq\('user_id',user\.id\)\.order\('sticker_id'\)\.range\(start,end\)/);
 assert.doesNotMatch(client,/\.rpc\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
 assert.match(client,/\.textContent=/);
});
test('owner creator verifies membership and cannot publish or upload',()=>{
 const html=file('owner-sticker-creator.html');
 const js=file('owner-sticker-creator.js');
 assert.match(html,/id="creator-content" hidden/);
 assert.match(html,/id="creator-publish" disabled/);
 assert.match(js,/auth\.getUser\(\)/);
 assert.match(js,/from\('owner_members'\)/);
 assert.match(js,/URL\.createObjectURL/);
 assert.doesNotMatch(js,/\.rpc\(|\.insert\(|\.update\(|\.upload\(/);
});
test('SQL proposal keeps inventory private and grants only audited owner awards',()=>{
 const sql=file('sql/review/20261028_sticker_inventory_proposal.sql');
 for(const table of ['sticker_sets','stickers','player_stickers','sticker_inventory_events'])
  assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
 assert.match(sql,/create policy own_sticker_inventory_read[\s\S]*user_id=\(select auth\.uid\(\)\)/);
 assert.match(sql,/security definer set search_path = ''/);
 assert.match(sql,/not exists\(select 1 from public\.owner_members where user_id=auth\.uid\(\)\)/);
 assert.match(sql,/revoke all on function public\.owner_award_sticker\(uuid,uuid,integer,text\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.owner_award_sticker\(uuid,uuid,integer,text\) to authenticated/);
 assert.doesNotMatch(sql,/grant\s+(?:insert|update|delete|all)\s+on\s+public\.player_stickers\s+to\s+authenticated/i);
 assert.doesNotMatch(sql,/grant\s+.+\s+to\s+anon/i);
});

test('pagination reads every ordered page without silently truncating inventory',async()=>{
 const all=Array.from({length:1203},(_,i)=>({id:i}));
 const calls=[];
 const rows=await collectPagedRows(async(start,end)=>{
  calls.push([start,end]);
  return {data:all.slice(start,end+1),error:null};
 },{pageSize:500,maxPages:5});
 assert.equal(rows.length,1203);
 assert.deepEqual(rows,all);
 assert.deepEqual(calls,[[0,499],[500,999],[1000,1499]]);
});
test('pagination fails closed on unsafe limits, invalid pages and server errors',async()=>{
 await assert.rejects(collectPagedRows(async()=>({data:[1,2],error:null}),{pageSize:2,maxPages:2}),/safe page limit/);
 await assert.rejects(collectPagedRows(async()=>({data:null,error:null})),/Invalid paginated response/);
 await assert.rejects(collectPagedRows(async()=>({data:null,error:new Error('RLS denied')})),/RLS denied/);
 await assert.rejects(collectPagedRows(async()=>({data:[],error:null}),{pageSize:1001}),/Invalid pagination settings/);
});
test('collection queries use deterministic ordered ranges and never show partial totals',()=>{
 const client=file('sticker-collection.js');
 assert.match(client,/collectPagedRows/);
 assert.match(client,/\.order\('id'\)\.range\(start,end\)/);
 assert.match(client,/\.order\('sticker_id'\)\.range\(start,end\)/);
 assert.doesNotMatch(client,/\.limit\(1000\)/);
});

test('sticker binder search combines with rarity, album and ownership filters',()=>{
 const {catalog}=createStickerView(sets,stickers,[{sticker_id:'1',quantity:2}]);
 assert.deepEqual(filterStickers(catalog,{search:' PIXEL ',rarity:'Rare',owned:'yes'}).map(s=>s.id),['1']);
 assert.deepEqual(filterStickers(catalog,{search:'arcade originals',owned:'no'}).map(s=>s.id),['2']);
 assert.deepEqual(filterStickers(catalog,{search:'not-a-sticker'}),[]);
 assert.equal(filterStickers(catalog,{search:null}).length,3);
});
test('album shelf sorts alphabetically with Misc last',()=>{
 const albums=[{id:'c',slug:'misc',title:'Misc.'},{id:'d',slug:'zelda',title:'Zelda'},...sets];
 const view=createStickerView(albums,stickers,[]);
 assert.deepEqual(view.albums.map(s=>s.title),['Arcade Originals','Space','Zelda','Misc.']);
});
test('sticker HTML has valid theme script tags and a searchable Need filter',()=>{
 for(const path of ['sticker-collection.html','sticker-albums.html']){
  const html=file(path);
  assert.ok(html.includes('<script src="theme.js" defer></script><title>'));
  assert.ok(!html.includes('<script src="theme.js" defer><title>'));
 }
 const html=file('sticker-collection.html');
 assert.ok(html.includes('id="sticker-search-filter"'));
 assert.ok(html.includes('<option value="no">Need</option>'));
 const js=file('sticker-collection.js');
 assert.ok(js.includes("searchFilter?.addEventListener('input',renderStickers)"));
 assert.ok(js.includes('model=null;membershipMode=false;grid.replaceChildren();summary.replaceChildren()'));
});
test('owner draft is cleared when owner authorization is lost or changes',()=>{
 const js=file('owner-sticker-creator.js');
 assert.ok(js.includes('function clearDraft()'));
 assert.ok(js.includes('revokePreview()'));
 assert.ok(js.includes('verifiedOwnerId!==user.id'));
 assert.ok(js.includes('if(error||!owner){verifiedOwnerId=null;clearDraft()'));
 assert.ok(js.includes('if(authError||!user||user.is_anonymous){verifiedOwnerId=null;clearDraft()'));
});


test('Ctoon membership adapter isolates per-user ownership when RLS supplies each user rows',async()=>{
 const {adaptCtoonMembership}=await import('../sticker-collection-core.mjs');
 const catalog=[{id:'a',series:'Cartoons',title:'Alpha',published:true},{id:'b',series:'Anime',title:'Beta',published:true},{id:'draft',title:'Hidden',published:false}];
 const alice=adaptCtoonMembership(catalog,[{sticker_id:'a'}]);
 const bob=adaptCtoonMembership(catalog,[{sticker_id:'b'}]);
 assert.deepEqual(alice.map(s=>[s.id,s.owned]),[['a',true],['b',false]]);
 assert.deepEqual(bob.map(s=>[s.id,s.owned]),[['a',false],['b',true]]);
 assert.ok(alice.every(s=>s.quantity===null&&s.rarity===null));
 const page=file('sticker-collection.js');
 assert.ok(page.includes("from('ctoon_sticker_ownership').select('sticker_id').eq('user_id',user.id)"));
 for(const operation of ['.insert(','.update(','.upsert(','.delete('])assert.equal(page.includes(operation),false);
});
