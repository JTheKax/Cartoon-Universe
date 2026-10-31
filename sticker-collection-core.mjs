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
 }).sort((a,b)=>{const misc=s=>/^misc\.?$/i.test(s.title.trim());return Number(misc(a))-Number(misc(b))||a.title.localeCompare(b.title);});
 return {catalog,albums,totalOwned:catalog.filter(s=>s.quantity>0).length,
  totalCopies:catalog.reduce((n,s)=>n+s.quantity,0)};
}
export function filterStickers(catalog,{rarity='all',album='all',owned='all',search=''}={}){
 const query=typeof search==='string'?search.trim().toLocaleLowerCase().slice(0,100):'';
 return catalog.filter(s=>(rarity==='all'||s.rarity===rarity)&&
  (album==='all'||s.set.slug===album)&&
  (owned==='all'||(owned==='yes'?s.quantity>0:s.quantity===0))&&
  (!query||s.name.toLocaleLowerCase().includes(query)||s.set.title.toLocaleLowerCase().includes(query)));
}

/**
 * Read every page or fail closed. The fetcher returns Supabase-style {data,error}.
 * A bounded maximum prevents accidental unbounded client downloads; callers must
 * increase it deliberately when catalogs grow rather than show incomplete totals.
 */
export async function collectPagedRows(fetchPage,{pageSize=500,maxPages=40}={}){
 if(typeof fetchPage!=='function'||!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>1000||
    !Number.isSafeInteger(maxPages)||maxPages<1||maxPages>200)throw new TypeError('Invalid pagination settings');
 const rows=[];
 for(let page=0;page<maxPages;page++){
  const offset=page*pageSize;
  const result=await fetchPage(offset,offset+pageSize-1);
  if(result?.error)throw result.error;
  if(!Array.isArray(result?.data)||result.data.length>pageSize)
   throw new Error('Invalid paginated response');
  rows.push(...result.data);
  if(result.data.length<pageSize)return rows;
 }
 throw new Error('Sticker collection exceeds the safe page limit; increase the reviewed limit before displaying totals.');
}

/**
 * Nonproduction Ctoon membership adapter. This schema has no quantity or rarity;
 * never convert membership into an authoritative duplicate/copy count.
 * Callers must explicitly present unknown quantities and rarities as unknown.
 */
export function adaptCtoonMembership(catalog=[],ownership=[]){
 const ownedIds=new Set(ownership.filter(row=>row&&typeof row.sticker_id==='string').map(row=>row.sticker_id));
 return catalog.filter(row=>row&&typeof row.id==='string'&&row.published===true).map(row=>({
  id:row.id,
  series:row.series,
  subseries:row.subseries,
  name:row.title,
  artwork_url:row.artwork_url,
  owned:ownedIds.has(row.id),
  quantity:null,
  rarity:null
 }));
}

/** Overlay verified copy counts without inventing quantities for legacy ownership. */
export function applyCtoonQuantities(entries=[],rows=[]){
 const counts=new Map();
 for(const row of rows){
  if(!row||typeof row.sticker_id!=='string'||!Number.isSafeInteger(row.quantity)||row.quantity<0)throw new Error('Invalid Ctoon quantity');
  if(counts.has(row.sticker_id))throw new Error('Duplicate Ctoon quantity row');
  counts.set(row.sticker_id,row.quantity);
 }
 return entries.map(entry=>{
  const quantity=counts.has(entry.id)?counts.get(entry.id):null;
  if(quantity===0&&entry.owned)throw new Error('Ctoon quantity conflicts with existing ownership');
  return {...entry,quantity,owned:quantity===null?entry.owned:quantity>0};
 });
}
