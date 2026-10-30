import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const root=join(process.cwd(),'deploy','public-gateway-cutover');
const expected=['Cartoons','Anime','Movies','Video Games','Misc'];
function catalogFrom(filename){
 const src=readFileSync(join(root,filename),'utf8');
 const match=src.match(/const catalog=(\{[^;]+\});/);
 assert.ok(match,'missing catalog in '+filename);
 return JSON.parse(match[1]);
}
test('Sets Overview and My Collection have identical five-category catalogs',()=>{
 const sets=catalogFrom('sets-overview.js');
 const mine=catalogFrom('my-collection.js');
 assert.deepEqual(sets,mine);
 assert.deepEqual(Object.keys(sets),expected);
 assert.equal(Object.hasOwn(sets,'Disney'),false);
 for(const [group,names] of Object.entries(sets)){
  assert.ok(names.length>0,group+' must have series');
  assert.equal(new Set(names).size,names.length,group+' contains duplicate series');
 }
 for(const name of ["Dexter's Laboratory","Ed, Edd n Eddy","Johnny Bravo","Foster's Home for Imaginary Friends","The Powerpuff Girls","Samurai Jack","Courage the Cowardly Dog","Danny Phantom","Fairly OddParents","Kim Possible"]){
  const canonical=name==='The Powerpuff Girls'?'Powerpuff Girls':name;
  assert.ok(sets.Cartoons.includes(canonical),'missing cartoon '+canonical);
 }
 for(const name of ['Dragon Ball Z','Naruto','One Piece','Yu-Gi-Oh! GX'])assert.ok(sets.Anime.includes(name));
 for(const name of ['Kingdom Hearts','Super Mario','The Legend of Zelda'])assert.ok(sets['Video Games'].includes(name));
 assert.ok(sets.Movies.includes('The Nightmare Before Christmas'));
});
test('Both pages offer only the five matching category filters',()=>{
 for(const file of ['sets-overview.html','my-collection.html']){
  const html=readFileSync(join(root,file),'utf8');
  assert.ok(!/<option[^>]*>Disney<\/option>/.test(html));
  for(const name of expected)assert.ok(html.includes('>'+name+'</option>'),file+' missing '+name);
 }
});
test('All series tiles lead to detail pages; collection status stays read-only',()=>{
 for(const file of ['sets-overview.js','my-collection.js']){
  const src=readFileSync(join(root,file),'utf8');
  assert.ok(src.includes("link.href='set-detail.html?'"),file+' lacks detail link');
  assert.ok(src.includes("fetch('data/console-cartoon-anime-game-sets.draft.json'")||src.includes("fetch('data/console-cartoon-anime-game-sets.draft.json',{cache:"),file+' missing 90-series preview');
 }
 const mine=readFileSync(join(root,'my-collection.html'),'utf8');
 assert.ok(mine.includes('not connected'));
});
