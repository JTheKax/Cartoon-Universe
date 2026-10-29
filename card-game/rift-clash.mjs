// Cartoon Universe: Rift Clash — offline prototype. No currency, account or server writes.
export const CARDS=Object.freeze([
 {id:'spark',name:'Spark Scout',cost:1,power:2,guard:1,kind:'pulse'},
 {id:'moss',name:'Moss Guardian',cost:2,power:1,guard:4,kind:'shield'},
 {id:'nova',name:'Nova Rider',cost:3,power:4,guard:1,kind:'pulse'},
 {id:'glitch',name:'Glitch Fox',cost:2,power:3,guard:1,kind:'trick'},
 {id:'tide',name:'Tide Weaver',cost:2,power:2,guard:3,kind:'shield'},
 {id:'orbit',name:'Orbit Knight',cost:4,power:5,guard:3,kind:'pulse'},
 {id:'pixel',name:'Pixel Sprite',cost:1,power:1,guard:2,kind:'trick'},
 {id:'echo',name:'Echo Mage',cost:3,power:3,guard:2,kind:'trick'}
]);
export const byId=Object.freeze(Object.fromEntries(CARDS.map(c=>[c.id,c])));
export const STARTER=Object.freeze(CARDS.flatMap(c=>[c.id,c.id]));
export function validateDeck(deck){
 if(!Array.isArray(deck)||deck.length!==16)return false;
 const counts={};
 for(const id of deck){if(!Object.hasOwn(byId,id))return false;counts[id]=(counts[id]||0)+1;if(counts[id]>2)return false;}
 return true;
}
export function newGame(deck=STARTER,opponent=STARTER,random=Math.random){
 if(!validateDeck(deck)||!validateDeck(opponent))throw new Error('Deck must contain 16 cards, max 2 of each.');
 const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const players=[deck,opponent].map(cards=>({health:20,energy:0,deck:shuffle(cards),hand:[],field:[]}));
 const game={players,turn:0,round:1,winner:null,log:['Rift Clash begins!']};
 for(const p of players)draw(p,3);
 startTurn(game);return game;
}
function draw(p,n=1){while(n--&&p.deck.length&&p.hand.length<7)p.hand.push(p.deck.pop());}
function startTurn(g){const p=g.players[g.turn];p.energy=Math.min(6,g.round+1);draw(p);g.log.push('Player '+(g.turn+1)+' turn: '+p.energy+' energy');}
export function playCard(g,index){
 if(g.winner!==null)throw new Error('Game over');
 const p=g.players[g.turn],other=g.players[1-g.turn];
 if(!Number.isInteger(index)||index<0||index>=p.hand.length)throw new Error('Invalid card');
 const card=byId[p.hand[index]];
 if(card.cost>p.energy)throw new Error('Not enough energy');
 if(p.field.length>=3)throw new Error('Your field is full');
 p.energy-=card.cost;p.hand.splice(index,1);
 p.field.push({id:card.id,guard:card.guard});
 // Three original effects: shield grants +1 guard, trick draws, pulse strikes.
 if(card.kind==='shield')p.field[p.field.length-1].guard++;
 if(card.kind==='trick')draw(p);
 if(card.kind==='pulse')other.health=Math.max(0,other.health-1);
 g.log.push('Player '+(g.turn+1)+' deployed '+card.name);
 resolveWinner(g);return g;
}
export function endTurn(g){
 if(g.winner!==null)throw new Error('Game over');
 const attacker=g.players[g.turn],defender=g.players[1-g.turn];
 for(const unit of attacker.field){
  let damage=byId[unit.id].power;
  while(damage>0&&defender.field.length){
   const target=defender.field[0],absorbed=Math.min(damage,target.guard);
   target.guard-=absorbed;damage-=absorbed;
   if(target.guard===0)defender.field.shift();
  }
  if(damage>0)defender.health=Math.max(0,defender.health-damage);
 }
 g.log.push('Player '+(g.turn+1)+' attacks');
 resolveWinner(g);
 if(g.winner!==null)return g;
 g.turn=1-g.turn;if(g.turn===0)g.round++;
 startTurn(g);return g;
}
function resolveWinner(g){
 const [a,b]=g.players;
 if(a.health===0||b.health===0){g.winner=a.health===b.health?'draw':a.health===0?1:0;g.log.push('Game over');}
 else if(g.round>30){g.winner=a.health===b.health?'draw':a.health>b.health?0:1;g.log.push('Round limit reached');}
}
