// Pure sticker view models. Safe to test with mock data; never grants inventory.
export const RARITIES=Object.freeze(['Common','Uncommon','Rare','Epic','Legendary','Prize Only']);
const rarityOrder=new Map(RARITIES.map((rarity,index)=>[rarity,index]));
export function safeStickerArt(path){
 if(typeof path!=='string'||path.includes('..')||path.includes('\\')||path.startsWith('/'))return null;
 return /^assets\/stickers\/[A-Za-z0-9_/-]+\.(?:png|jpe?g|webp)$/i.test(path)?path:null;
}
export function createStickerView(sets=[],stickers=[],inventory=[]){
 const setMap=new Map(sets.filter(s=>s&&typeof s.id==='string'&&typeof s.title==='string').map(s=>[s.id,s]));
 const owned=new Map();
 for(const item of inventory){
  if(!item||typeof item.sticker_id!=='string')continue;
  const qty=Number(item.quantity);
  if(Number.isSafeInteger(qty)&&qty>0)owned.set(item.sticker_id,(owned.get(item.sticker_id)||0)+qty);
 }
 const catalog=stickers.filter(s=>s&&typeof s.id==='string'&&setMap.has(s.set_id)&&rarityOrder.has(s.rarity))
   .map(s=>({...s,quantity:owned.get(s.id)||0,set:setMap.get(s.set_id)}))
   .sort((a,b)=>rarityOrder.get(b.rarity)-rarityOrder.get(a.rarity)||a.name.localeCompare(b.name));
 const albums=Array.from(setMap.values()).map(set=>{
  const entries=catalog.filter(s=>s.set_id===set.id);
  return {...set,total:entries.length,collected:entries.filter(s=>s.quantity>0).length,
   duplicates:entries.reduce((n,s)=>n+Math.max(0,s.quantity-1),0)};
 }).sort((a,b)=>a.title.localeCompare(b.title));
 return {catalog,albums,totalOwned:catalog.filter(s=>s.quantity>0).length,
  totalCopies:catalog.reduce((n,s)=>n+s.quantity,0)};
}
export function filterStickers(catalog,{rarity='all',album='all',owned='all'}={}){
 return catalog.filter(s=>(rarity==='all'||s.rarity===rarity)&&
  (album==='all'||s.set.slug===album)&&
  (owned==='all'||(owned==='yes'?s.quantity>0:s.quantity===0)));
}
