// Yu-Gi-Oh! card data adapter for an isolated, noncommercial prototype.
// Public YGOPRODeck API documentation: https://ygoprodeck.com/api-guide/
// Names, attributes and statistics are metadata; image usage requires separate review.
// Never treat external API card text as executable code.
export const API='https://db.ygoprodeck.com/api/v7/cardinfo.php';
export function normalizeCard(raw){
 if(!raw||!Number.isInteger(raw.id)||typeof raw.name!=='string')throw new Error('Invalid card');
 return Object.freeze({
  id:raw.id,name:raw.name,type:String(raw.type||''),description:String(raw.desc||''),
  atk:Number.isFinite(raw.atk)?raw.atk:null,def:Number.isFinite(raw.def)?raw.def:null,
  level:Number.isFinite(raw.level)?raw.level:null,attribute:raw.attribute||null,
  race:raw.race||null,archetype:raw.archetype||null
 });
}
export async function searchCards(query,{fetchImpl=fetch,signal}={}){
 const name=String(query||'').trim();
 if(name.length<2||name.length>80)throw new Error('Search must be 2–80 characters');
 const url=new URL(API);url.searchParams.set('fname',name);url.searchParams.set('num','30');url.searchParams.set('offset','0');
 const response=await fetchImpl(url,{signal,headers:{Accept:'application/json'}});
 if(response.status===400)return [];
 if(!response.ok)throw new Error('Card catalog unavailable');
 const data=await response.json();
 if(!Array.isArray(data.data))throw new Error('Invalid catalog response');
 return data.data.map(normalizeCard);
}
export function validateDuelDeck(ids){
 if(!Array.isArray(ids)||ids.length<40||ids.length>60)return false;
 const counts=new Map();
 for(const id of ids){
  if(!Number.isInteger(id)||id<=0)return false;
  counts.set(id,(counts.get(id)||0)+1);
  if(counts.get(id)>3)return false;
 }
 // Banlist, extra deck, limited/semi-limited and format checks are not implemented yet.
 return true;
}
