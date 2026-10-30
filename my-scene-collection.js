import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';import {isSupabaseConfigured} from './supabase-config.js';
const status=document.getElementById('scene-inventory-status'),picker=document.getElementById('scene-owned-stickers');
if(status&&picker){if(!isSupabaseConfigured(SUPABASE_URL,SUPABASE_ANON_KEY)){status.textContent='Collection service unavailable.'}else{
const client=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
async function refresh(){
 picker.replaceChildren();
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user){status.textContent='Sign in to use your owned stickers.';const a=document.createElement('a');a.href='login.html';a.textContent='Sign in';picker.append(a);return}
 const {data:owned,error}=await client.from('player_stickers').select('sticker_id,quantity,sticker_catalog(id,title,image_url,active)').eq('user_id',user.id).limit(150);
 if(error){status.textContent='Owned sticker collection is not connected yet. Preview uploads remain available.';return}
 const records=(owned||[]).filter(row=>row.quantity>0&&row.sticker_catalog?.active===true);
 status.textContent=records.length?'Choose one of your owned stickers to add to the scene.':'No owned stickers found yet.';
 for(const record of records){const sticker=record.sticker_catalog;const button=document.createElement('button');button.type='button';button.className='scene-owned-choice';const img=document.createElement('img');img.src=sticker.image_url;img.alt='';img.loading='lazy';const name=document.createElement('span');name.textContent=sticker.title;button.append(img,name);button.addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('cu:add-owned-sticker',{detail:{stickerId:record.sticker_id,imageUrl:sticker.image_url}}))});picker.append(button)}
}
client.auth.onAuthStateChange(()=>{setTimeout(refresh,0)});void refresh()
}}