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
 nameInput.value='';albumInput.value='';rarityInput.value='Common';fileInput.value='';
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
  status.textContent='Owner verified. You can preview drafts; publishing is not enabled.';
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
