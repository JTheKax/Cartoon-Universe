import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
import {RARITIES,createStickerView,filterStickers,safeStickerArt,collectPagedRows} from './sticker-collection-core.mjs';

const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const status=document.getElementById('sticker-status');
const app=document.getElementById('sticker-app');
const grid=document.getElementById('sticker-grid');
const summary=document.getElementById('sticker-summary');
const view=document.body.dataset.stickerView;
const albumFilter=document.getElementById('sticker-album-filter');
const rarityFilter=document.getElementById('sticker-rarity-filter');
const ownedFilter=document.getElementById('sticker-owned-filter');
const searchFilter=document.getElementById('sticker-search-filter');
const ownerLink=document.getElementById('sticker-owner-link');
let revision=0;
let model=null;
document.querySelector('[data-nav="'+view+'"]')?.setAttribute('aria-current','page');
function el(tag,className,text){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
}
function setMessage(message,kind='info'){
 status.textContent=message;
 status.dataset.kind=kind;
}
function stat(label,value){
 const node=el('span');
 node.append(el('strong',null,value),' '+label);
 return node;
}
function art(path,label){
 const frame=el('div','sticker-art');
 const safe=safeStickerArt(path);
 if(safe){const img=el('img');img.src=safe;img.alt=label;img.loading='lazy';img.addEventListener('error',()=>frame.replaceChildren('🃏'),{once:true});frame.append(img);}
 else frame.textContent='🃏';
 return frame;
}
function renderStickers(){
 if(!model)return;
 const entries=filterStickers(model.catalog,{rarity:rarityFilter.value,album:albumFilter.value,owned:ownedFilter.value,search:searchFilter?.value||''});
 grid.replaceChildren();
 if(!entries.length){grid.append(el('p','sticker-message',model.catalog.length?'No stickers match these filters.':'No published stickers in the catalog yet.'));return;}
 for(const sticker of entries){
  const card=el('article','sticker-card'+(sticker.quantity?'':' is-missing'));
  card.dataset.rarity=sticker.rarity;
  card.append(art(sticker.image_path,sticker.name),el('h3',null,sticker.name),el('p',null,sticker.set.title));
  card.append(el('span','sticker-pill',sticker.rarity));
  card.append(el('p',null,sticker.quantity?'Owned: '+sticker.quantity:'Need'));
  grid.append(card);
 }
}
function renderAlbums(){
 grid.replaceChildren();
 if(!model.albums.length){grid.append(el('p','sticker-message','No published sticker albums yet.'));return;}
 for(const album of model.albums){
  const card=el('article','sticker-card');
  card.append(el('div','sticker-art','📚'),el('h3',null,album.title));
  card.append(el('p',null,album.collected+' of '+album.total+' stickers collected · '+album.needed+' Need'));
  const progress=el('div','sticker-progress');
  progress.setAttribute('role','progressbar');
  progress.setAttribute('aria-label',album.title+' completion');
  progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');
  const percent=album.completion;
  progress.setAttribute('aria-valuenow',String(percent));
  const bar=el('span');bar.style.width=percent+'%';progress.append(bar);
  card.append(progress,el('p',null,percent+'% complete · '+album.duplicates+' duplicate copies'));
  const breakdown=el('ul','sticker-rarity-progress');
  for(const rarity of RARITIES){
   const counts=album.rarityProgress[rarity];
   if(!counts.total)continue;
   const item=el('li');
   item.append(el('span',null,rarity),el('strong',null,counts.owned+' / '+counts.total));
   breakdown.append(item);
  }
  if(breakdown.childElementCount)card.append(breakdown);
  const link=el('a','sticker-link','Open album →');
  link.href='sticker-collection.html?album='+encodeURIComponent(album.slug);
  card.append(link);grid.append(card);
 }
}
function render(){
 summary.replaceChildren(stat('unique stickers',model.totalOwned),stat('Need',model.catalog.length-model.totalOwned),stat('total copies',model.totalCopies),stat('published stickers',model.catalog.length));
 if(view==='albums'){summary.append(stat('albums',model.albums.length));renderAlbums();return;}
 const requestedAlbum=new URLSearchParams(location.search).get('album');
 const current=albumFilter.value;
 albumFilter.replaceChildren(new Option('All albums','all'));
 for(const album of model.albums)albumFilter.add(new Option(album.title,album.slug));
 albumFilter.value=model.albums.some(a=>a.slug===requestedAlbum)?requestedAlbum:(model.albums.some(a=>a.slug===current)?current:'all');
 rarityFilter.replaceChildren(new Option('All rarities','all'));
 for(const rarity of RARITIES)rarityFilter.add(new Option(rarity,rarity));
 renderStickers();
}
async function load(){
 const current=++revision;
 app.hidden=true;ownerLink.hidden=true;model=null;grid.replaceChildren();summary.replaceChildren();setMessage('Checking your account…');
 try{
  const {data:{user},error:authError}=await client.auth.getUser();
  if(current!==revision)return;
  if(authError||!user||user.is_anonymous){setMessage('Sign in to see your personal sticker collection.');return;}
  // Owner navigation is cosmetic only; owner permissions are enforced separately by RLS.
  client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle()
   .then(({data,error})=>{if(current===revision&&!error&&data)ownerLink.hidden=false;})
   .catch(()=>{});
  const [sets,stickers,inventory]=await Promise.all([
   collectPagedRows((start,end)=>client.from('sticker_sets').select('id,slug,title').eq('published',true).order('id').range(start,end)),
   collectPagedRows((start,end)=>client.from('stickers').select('id,set_id,name,rarity,image_path').eq('published',true).order('id').range(start,end)),
   collectPagedRows((start,end)=>client.from('player_stickers').select('sticker_id,quantity').eq('user_id',user.id).order('sticker_id').range(start,end))
  ]);
  if(current!==revision)return;
  model=createStickerView(sets,stickers,inventory);
  render();app.hidden=false;
  setMessage('Showing your account’s read-only sticker collection. No changes can be made here.');

 }catch{
  if(current===revision)setMessage('Unable to load the complete sticker collection. The database may be unavailable or the safe pagination limit was reached. No partial totals are shown.','error');
 }
}
for(const control of [albumFilter,rarityFilter,ownedFilter])control?.addEventListener('change',renderStickers);
searchFilter?.addEventListener('input',renderStickers);
client.auth.onAuthStateChange(()=>setTimeout(load,0));
window.addEventListener('pageshow',load);
load();
