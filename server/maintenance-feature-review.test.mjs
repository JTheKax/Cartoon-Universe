import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../owner.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../maintenance-feature-review.js',import.meta.url),'utf8');
const controls=readFileSync(new URL('../maintenance-controls.js',import.meta.url),'utf8');
test('owner panel exposes page maintenance review controls',()=>{
 assert.match(html,/id="maintenance-feature-review"/);
 assert.match(html,/id="maintenance-feature-list"/);
 assert.match(html,/maintenance-feature-review\.js/);
 assert.match(html,/local to this page and are not saved/);
});
test('review controls use shared feature registry',()=>{
 assert.match(script,/PUBLIC_FEATURES,resolvePublicFeatureStatus/);
 assert.match(script,/routingConfirmed:false/);
 assert.match(script,/Effective live status: UNKNOWN/);
});
test('review panel cannot persist maintenance state',()=>{
 assert.doesNotMatch(script,/\.update\s*\(|\.insert\s*\(|\.upsert\s*\(|fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/);
});
test('real master switch remains disabled',()=>{
 assert.match(html,/id="maintenance-toggle"[^>]*disabled/);
 assert.match(controls,/toggle\.disabled=true/);
});
