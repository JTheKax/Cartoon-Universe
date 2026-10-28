import {CARDS,STARTER,validateDeck,newGame,playCard,endTurn,byId} from './rift-clash.mjs';
const $=id=>document.getElementById(id);
let deck=[...STARTER],game=null;
const label=id=>byId[id].name;
function renderDeck(){
 $('deck-count').textContent=deck.length+'/16 cards';
 $('deck-list').replaceChildren(...CARDS.map(card=>{
  const count=deck.filter(id=>id===card.id).length;
  const b=document.createElement('button');b.type='button';
  b.textContent=card.name+' ('+count+'/2) · '+card.cost+' energy · '+card.power+' power · '+card.guard+' guard';
  b.disabled=count>=2||deck.length>=16;b.onclick=()=>{deck.push(card.id);renderDeck();};return b;
 }));
 $('deck-selected').replaceChildren(...deck.map((id,i)=>{
  const b=document.createElement('button');b.type='button';b.textContent='Remove '+label(id);
  b.onclick=()=>{deck.splice(i,1);renderDeck();};return b;
 }));
 $('deck-valid').textContent=validateDeck(deck)?'Deck ready for battle':'Choose exactly 16 cards, at most 2 of each.';
 try{localStorage.setItem('cu-rift-deck',JSON.stringify(deck));}catch{}
}
function renderGame(){
 if(!game)return;
 const you=game.players[0],bot=game.players[1];
 $('battle-status').textContent=game.winner!==null?'Winner: '+(game.winner==='draw'?'Draw':game.winner===0?'You':'CPU'):'Round '+game.round+' · '+(game.turn===0?'Your turn':'CPU turn');
 $('battle-stats').textContent='You: '+you.health+' HP, '+you.energy+' energy · CPU: '+bot.health+' HP · CPU hand: '+bot.hand.length;
 const field=(id,p)=>$(id).replaceChildren(...p.field.map(unit=>{
  const c=byId[unit.id],s=document.createElement('span');s.className='rift-unit';s.textContent=c.name+' | '+c.power+' power / '+unit.guard+' guard';return s;
 }));
 field('your-field',you);field('cpu-field',bot);
 $('your-hand').replaceChildren(...you.hand.map((id,i)=>{
  const c=byId[id],b=document.createElement('button');b.type='button';
  b.textContent=c.name+' · '+c.cost+' energy · '+c.power+' power';
  b.disabled=game.turn!==0||game.winner!==null||c.cost>you.energy||you.field.length>=3;
  b.onclick=()=>{playCard(game,i);renderGame();};return b;
 }));
 $('end-turn').disabled=game.turn!==0||game.winner!==null;
 $('battle-log').textContent=game.log.slice(-8).join('\n');
}
function cpuTurn(){
 if(game.winner!==null)return;
 while(game.turn===1&&game.winner===null){
  const p=game.players[1],idx=p.hand.findIndex(id=>byId[id].cost<=p.energy&&p.field.length<3);
  if(idx<0)break;playCard(game,idx);
 }
 if(game.winner===null&&game.turn===1)endTurn(game);
}
$('start-battle').onclick=()=>{if(!validateDeck(deck))return;game=newGame(deck);renderGame();};
$('end-turn').onclick=()=>{endTurn(game);cpuTurn();renderGame();};
$('reset-deck').onclick=()=>{deck=[...STARTER];renderDeck();};
try{const saved=JSON.parse(localStorage.getItem('cu-rift-deck'));if(validateDeck(saved))deck=saved;}catch{}
renderDeck();
