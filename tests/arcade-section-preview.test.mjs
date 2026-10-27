import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../arcade-redesign.js',import.meta.url),'utf8');

test('arcade section board is explicitly a non-authoritative preview',()=>{
 assert.match(source,/PREVIEW ONLY/);
 assert.match(source,/NOT LIVE STATUS/);
 assert.doesNotMatch(source,/● AVAILABLE/);
});

test('section preview navigation uses homepage URLs on secondary pages',()=>{
 assert.match(source,/link\.href='index\.html'\+href/);
});

test('owner maintenance switch stays disabled until enforcement is implemented',()=>{
 const controls=readFileSync(new URL('../maintenance-controls.js',import.meta.url),'utf8');
 assert.match(controls,/toggle\.disabled=true/);
 assert.doesNotMatch(controls,/update\(\{[^}]*enabled\s*:/);
});
