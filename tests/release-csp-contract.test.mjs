import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const source=path=>readFileSync(resolve(root,path),'utf8');
const gateway=source('server/gateway-candidate.mjs');
const fileAllowlist=gateway.match(/const ARCADE_FILES=new Set\(\[([\s\S]*?)\]\);/)?.[1]||'';
const allowed=new Set([...fileAllowlist.matchAll(/'([^']+)'/g)].map(match=>match[1]));

test('owner gateway preserves a strict script CSP',()=>{
 assert.match(gateway,/script-src 'self' https:\/\/esm\.sh/);
 assert.doesNotMatch(gateway,/script-src[^"\n]*unsafe-inline/);
 assert.match(gateway,/media-src 'self' blob:/,'Local file previews require blob: video sources');
});

for(const [page,script] of [
 ['index.html','nav-account-controls.js'],
 ['account.html','account-redirect.js'],
 ['shop-collect.html','shop-collect-controller.js'],
 ['shop-shop.html','shop-inventory-controller.js'],
 ['shop-watch-movies.html','shop-local-movie.js']
]){
 test(page+' runs its client controls with CSP-safe external JavaScript',()=>{
  const html=source(page);
  assert.match(html,new RegExp('<script[^>]*src="'+script.replaceAll('.','\\.')+'"[^>]*><\\/script>'));
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   assert.equal(match[2].trim(),'','Inline script blocked by gateway CSP on '+page);
  }
  assert.ok(allowed.has(script),script+' must be in owner gateway allowlist');
  assert.ok(source(script).trim().length>0,script+' must contain JavaScript');
 });
}

test('public sticker catalog is available for the protected Collect page',()=>{
 assert.ok(allowed.has('sticker-catalog.json'));
 assert.match(gateway,/\.json':'application\/json/);
 const data=JSON.parse(source('sticker-catalog.json'));
 assert.ok(Array.isArray(data.stickers));
});
