import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCard,validateDuelDeck,searchCards} from './card-catalog.mjs';
test('normalize official card metadata without copying image URLs',()=>{
 const card=normalizeCard({id:46986414,name:'Dark Magician',type:'Normal Monster',atk:2500,def:2100,card_images:[{image_url:'https://example.com/art.jpg'}]});
 assert.equal(card.name,'Dark Magician');assert.equal(card.atk,2500);assert.equal('card_images' in card,false);
});
test('preliminary deck rules require 40–60 cards and max 3 copies',()=>{
 assert.equal(validateDuelDeck(Array.from({length:40},(_,i)=>i+1)),true);
 assert.equal(validateDuelDeck(Array.from({length:39},(_,i)=>i+1)),false);
 assert.equal(validateDuelDeck([1,1,1,1,...Array.from({length:36},(_,i)=>i+2)]),false);
});
test('card search URL is encoded and maps API response',async()=>{
 let called='';
 const cards=await searchCards('Blue-Eyes',{fetchImpl:async url=>{called=String(url);return {ok:true,json:async()=>({data:[{id:89631139,name:'Blue-Eyes White Dragon',type:'Normal Monster',atk:3000,def:2500}]})};}});
 assert.match(called,/fname=Blue-Eyes/);assert.equal(cards[0].atk,3000);
});
