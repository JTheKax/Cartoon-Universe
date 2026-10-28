import {searchCards,validateDuelDeck} from './card-catalog.mjs';
const $=id=>document.getElementById(id);
const deck=[];
const names=new Map();
function drawDeck(){
 $('count').textContent=deck.length+'/40–60'+(validateDuelDeck(deck)?' · Preliminary deck size valid':'');
 $('deck-list').replaceChildren(...deck.map((id,index)=>{
  const row=document.createElement('p'),button=document.createElement('button');
  button.type='button';button.textContent='Remove';button.onclick=()=>{deck.splice(index,1);drawDeck();};
  row.append(document.createTextNode((names.get(id)||String(id))+' '),button);return row;
 }));
}
$('clear').onclick=()=>{deck.length=0;drawDeck();};
$('search-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.target.querySelector('button');
 button.disabled=true;$('status').textContent='Searching card metadata…';$('results').replaceChildren();
 try{
  const cards=await searchCards($('search').value);
  $('status').textContent=cards.length+' card(s) found';
  for(const card of cards){
   names.set(card.id,card.name);
   const box=document.createElement('article');box.className='card';
   const h=document.createElement('h3');h.textContent=card.name;
   const meta=document.createElement('p');meta.textContent=card.type+' · ATK '+(card.atk??'—')+' / DEF '+(card.def??'—');
   const desc=document.createElement('p');desc.textContent=card.description.slice(0,350);
   const add=document.createElement('button');add.textContent='Add to deck';
   add.onclick=()=>{
    if(deck.length>=60||deck.filter(id=>id===card.id).length>=3)return;
    deck.push(card.id);drawDeck();
   };
   box.append(h,meta,desc,add);$('results').append(box);
  }
 }catch{$('status').textContent='Catalog unavailable. Please retry.';}
 finally{button.disabled=false;}
});
drawDeck();
