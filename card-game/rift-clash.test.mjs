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
