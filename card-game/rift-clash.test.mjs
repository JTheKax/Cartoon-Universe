import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,STARTER,validateDeck,newGame,playCard,endTurn} from './rift-clash.mjs';
test('starter is a legal sixteen-card deck',()=>{assert.equal(CARDS.length,8);assert.equal(validateDeck(STARTER),true);});
test('rejects invalid decks and too many duplicates',()=>{
 assert.equal(validateDeck(STARTER.slice(1)),false);
 assert.equal(validateDeck([...STARTER.slice(0,15),'unknown']),false);
 assert.equal(validateDeck([...STARTER.slice(0,15),'spark']),false);
});
test('battle starts with three-card hands and bounded energy',()=>{
 const g=newGame(STARTER,STARTER,()=>0.5);
 assert.equal(g.players[0].hand.length,4);
 assert.equal(g.players[1].hand.length,3);
 assert.equal(g.players[0].energy,2);
 assert.equal(g.winner,null);
});
test('turn changes and cannot play cards without enough energy',()=>{
 const g=newGame(STARTER,STARTER,()=>0.5);
 const costly=g.players[0].hand.findIndex(id=>id==='orbit');
 if(costly>=0)assert.throws(()=>playCard(g,costly),/energy/);
 endTurn(g);assert.equal(g.turn,1);
 endTurn(g);assert.equal(g.turn,0);assert.equal(g.round,2);
});
test('invalid hand index is rejected',()=>{assert.throws(()=>playCard(newGame(),-1),/Invalid card/);});


test('pulse deployment damages opponent and spends energy',()=>{
 const g=newGame(STARTER,STARTER,()=>0.5);
 g.players[0].hand=['spark'];g.players[0].energy=2;
 playCard(g,0);
 assert.equal(g.players[1].health,19);
 assert.equal(g.players[0].energy,1);
 assert.equal(g.players[0].field[0].guard,1);
});
test('shield deployment increases guard and trick draws a card',()=>{
 const g=newGame(STARTER,STARTER,()=>0.5);
 g.players[0].hand=['moss','pixel'];g.players[0].energy=5;
 const originalDeck=g.players[0].deck.length;
 playCard(g,0);
 assert.equal(g.players[0].field[0].guard,5);
 playCard(g,0);
 assert.equal(g.players[0].deck.length,originalDeck-1);
});
test('field limit prevents a fourth deployment',()=>{
 const g=newGame(STARTER,STARTER,()=>0.5);
 g.players[0].hand=['spark'];g.players[0].field=[{id:'moss',guard:4},{id:'moss',guard:4},{id:'moss',guard:4}];
 assert.throws(()=>playCard(g,0),/field is full/);
});
test('attacks break guard and carry excess damage into health',()=>{
 const g=newGame(STARTER,STARTER,()=>0.5);
 g.players[0].field=[{id:'orbit',guard:3}];
 g.players[1].field=[{id:'pixel',guard:2}];
 endTurn(g);
 assert.equal(g.players[1].field.length,0);
 assert.equal(g.players[1].health,17);
});
test('a lethal attack declares winner and prevents further turns',()=>{
 const g=newGame(STARTER,STARTER,()=>0.5);
 g.players[0].field=[{id:'orbit',guard:3}];
 g.players[1].health=3;g.players[1].field=[];
 endTurn(g);
 assert.equal(g.winner,0);
 assert.throws(()=>endTurn(g),/Game over/);
});
