import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
import {RARITIES} from './sticker-collection-core.mjs';
const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const content=document.getElementById('creator-content');
const status=document.getElementById('creator-status');
const nameInput=document.getElementById('creator-name');
const albumInput=document.getElementById('creator-album');
const rarityInput=document.getElementById('creator-rarity');
const fileInput=document.getElementById('creator-image');
const art=document.getElementById('creator-art');
let revision=0,previewUrl=null,verifiedOwnerId=null;
function revokePreview(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}}
function clearDraft(){
 revokePreview();
 nameInput.value='';albumInput.value='';rarityInput.value='Common';fileInput.value='';document.getElementById('creator-price').value='';
 art.replaceChildren('🃏');
 document.getElementById('creator-preview-name').textContent='Untitled Ctoon';
 document.getElementById('creator-preview-album').textContent='No album selected';
 document.getElementById('creator-preview-rarity').textContent='Common';
}
async function verifyOwner(){
 const current=++revision;content.hidden=true;status.textContent='Verifying owner access…';
 try{
  const {data:{user},error:authError}=await client.auth.getUser();
  if(current!==revision)return;
  if(authError||!user||user.is_anonymous){verifiedOwnerId=null;clearDraft();status.textContent='Sign in with the owner account to access the Ctoon Creator.';return;}
  const {data:owner,error}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
  if(current!==revision)return;
  if(error||!owner){verifiedOwnerId=null;clearDraft();status.textContent='Owner access required. This studio is not available to players.';return;}
  if(verifiedOwnerId!==user.id){clearDraft();verifiedOwnerId=user.id;}
  content.hidden=false;
  await loadOwnerCatalog();
  status.textContent='Owner verified. You can upload artwork and save unpublished Ctoon drafts.';
 }catch{if(current===revision){verifiedOwnerId=null;clearDraft();status.textContent='Unable to verify owner access. Try again later.';}}
}
document.getElementById('creator-preview-button').addEventListener('click',()=>{
 if(content.hidden)return;
 document.getElementById('creator-preview-name').textContent=nameInput.value.trim().slice(0,70)||'Untitled Ctoon';
 document.getElementById('creator-preview-album').textContent=albumInput.value.trim().slice(0,70)||'No album selected';
 document.getElementById('creator-preview-rarity').textContent=RARITIES.includes(rarityInput.value)?rarityInput.value:'Common';
 revokePreview();art.replaceChildren('🃏');
 const file=fileInput.files?.[0];
 if(!file){status.textContent='Draft preview updated. No artwork selected.';return;}
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024||file.size===0){
  status.textContent='Choose a PNG, JPG or WebP image smaller than 5 MB.';return;
 }
 previewUrl=URL.createObjectURL(file);
 const img=document.createElement('img');
 img.alt='Local Ctoon draft artwork';
 img.src=previewUrl;
 img.addEventListener('error',()=>{revokePreview();art.replaceChildren('🃏');status.textContent='Could not preview this image.';},{once:true});
 art.replaceChildren(img);
 status.textContent='Local draft preview updated. Nothing was uploaded or published.';
});
window.addEventListener('pagehide',revokePreview);
client.auth.onAuthStateChange(()=>setTimeout(verifyOwner,0));
window.addEventListener('pageshow',verifyOwner);
verifyOwner();

document.getElementById('creator-publish').addEventListener('click',async()=>{
 const button=document.getElementById('creator-publish');
 if(!verifiedOwnerId||content.hidden)return;
 const name=nameInput.value.trim(),series=albumInput.value.trim();
 const priceText=document.getElementById('creator-price').value.trim();
 const coinPrice=priceText===''?null:Number(priceText);
 if(coinPrice!==null&&(!Number.isSafeInteger(coinPrice)||coinPrice<0||coinPrice>1000000)){status.textContent='Enter a valid nonnegative coin price.';return;}
 const file=fileInput.files?.[0];
 if(!name||!series||!file){status.textContent='Enter a Ctoon name, series and artwork before publishing.';return;}
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size<1||file.size>5*1024*1024){status.textContent='Artwork must be PNG, JPG or WebP, up to 5 MB.';return;}
 button.disabled=true;
 try{
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user||user.id!==verifiedOwnerId||user.is_anonymous)throw new Error('Owner session changed. Sign in again.');
  const {data:owner,error:ownerError}=await client.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();
  if(ownerError||!owner)throw new Error('Owner verification failed.');
  const code='ctoon-'+crypto.randomUUID();
  const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const key=code+'.'+ext;
  const {error:uploadError}=await client.storage.from('ctoon-artwork').upload(key,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  const {data:publicData}=client.storage.from('ctoon-artwork').getPublicUrl(key);
  const {error:saveError}=await client.from('ctoon_sticker_catalog').insert({
   series,subseries:null,sticker_code:code,title:name,artwork_url:publicData.publicUrl,rarity:rarityInput.value,coin_price:coinPrice,published:false
  });
  if(saveError)throw new Error('Artwork uploaded, but the draft record was not saved: '+saveError.message);
  status.textContent='Ctoon artwork uploaded and draft saved. It is unpublished until approved in the catalog.';
  clearDraft();await loadOwnerCatalog();
 }catch(error){status.textContent='Unable to save Ctoon draft: '+error.message;}
 finally{button.disabled=false;}
});

async function loadOwnerCatalog(){
 const root=document.getElementById('creator-catalog');
 root.replaceChildren();
 if(!verifiedOwnerId)return;
 const {data,error}=await client.from('ctoon_sticker_catalog').select('id,title,series,rarity,coin_price,published').order('created_at',{ascending:false}).limit(200);
 if(error){root.textContent='Unable to load owner Ctoon catalog.';return;}
 if(!data?.length){root.textContent='No Ctoon drafts yet.';return;}
 for(const item of data){
  const row=document.createElement('div');row.className='sticker-card';
  const title=document.createElement('strong');title.textContent=item.title+' · '+item.series;
  const state=document.createElement('p');state.textContent=item.published?'Published':'Draft';
  const toggle=document.createElement('button');toggle.type='button';toggle.textContent=item.published?'Unpublish':'Publish';
  toggle.addEventListener('click',async()=>{
   toggle.disabled=true;
   const {error:updateError}=await client.from('ctoon_sticker_catalog').update({published:!item.published}).eq('id',item.id);
   if(updateError){status.textContent='Unable to change publication: '+updateError.message;toggle.disabled=false;return;}
   status.textContent=item.published?'Ctoon unpublished.':'Ctoon published.';
   await loadOwnerCatalog();
  });
  row.append(title,state,toggle);root.append(row);
 }
}
