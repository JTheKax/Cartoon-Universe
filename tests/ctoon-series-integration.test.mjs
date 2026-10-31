import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const catalog = JSON.parse(read('data/ctoon-series-plan.json'));

test('planned Ctoon catalog has five unique categories and 44 unique series', () => {
  assert.deepEqual(catalog.categories.map(c => c.id), ['cartoons','anime','movies','video-games','misc']);
  const names = catalog.categories.flatMap(c => c.series);
  assert.equal(names.length, 44);
  assert.equal(new Set(names.map(n => n.toLowerCase())).size, 44);
});
test('every category and subseries has safe display values', () => {
  for (const category of catalog.categories) {
    assert.equal(typeof category.name, 'string');
    assert.ok(Array.isArray(category.series));
    for (const name of category.series) {
      assert.ok(name.length > 0 && name.length < 100);
      assert.equal(name.trim(), name);
    }
  }
});
test('overview and detail use shared catalog rather than outdated hardcoded lists', () => {
  assert.match(read('sets-overview.js'), /ctoon-series-plan\.json/);
  assert.match(read('set-detail.html'), /ctoon-series-plan\.json/);
  assert.doesNotMatch(read('sets-overview.js'), /const series = \[/);
});
test('collection deep links filter against published albums only', () => {
  const source = read('sticker-collection.js');
  assert.match(source, /requestedSeries/);
  assert.match(source, /model\.albums\.find/);
  assert.match(source, /eq\('published',true\)/);
  assert.match(source, /eq\('user_id',user\.id\)/);
});
test('series detail has no literal escaped line breaks in executable script', () => {
  const source = read('set-detail.html');
  const script = source.split('<script>')[1]?.split('</script>')[0] || '';
  assert.ok(script.includes('loadDetail()'));
  assert.ok(!script.includes('\\n'));
});


test('unpublished series links never silently show unrelated Ctoons',()=>{
 const collection=readFileSync(new URL('../sticker-collection.js',import.meta.url),'utf8');
 assert.match(collection,/normalized\(a\.title\)===normalized\(requestedSeries\)/);
 assert.match(collection,/requestedSeries&&!matchingSeries/);
 assert.match(collection,/No published Ctoon album matches this series yet\. Coming Soon\./);
});


test('Ctoon membership adapter preserves unknown duplicate counts',async()=>{
 const {adaptCtoonMembership}=await import('../sticker-collection-core.mjs');
 const catalog=[{id:'a',series:'Cartoons',title:'Example',published:true},{id:'b',series:'Anime',title:'Draft',published:false}];
 const rows=adaptCtoonMembership(catalog,[{sticker_id:'a'}]);
 assert.equal(rows.length,1);
 assert.equal(rows[0].owned,true);
 assert.equal(rows[0].quantity,null);
 assert.equal(rows[0].rarity,null);
});
