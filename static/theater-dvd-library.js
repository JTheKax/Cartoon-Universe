import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from '../config.js';
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const shelf=document.getElementById('dvd-shelf');
const player=document.getElementById('theater-youtube-player');
const placeholder=document.getElementById('theater-library-placeholder');
const note=document.getElementById('dvd-selection');
async function load(){const {data,error}=await db.from('theater_dvd_library').select('title,youtube_id').order('created_at',{ascending:false});if(error){return;}for(const movie of data||[]){if(!/^[A-Za-z0-9_-]{11}$/.test(movie.youtube_id))continue;const button=document.createElement('button');button.type='button';button.className='dvd-case';const cover=document.createElement('img');cover.src='https://img.youtube.com/vi/'+movie.youtube_id+'/hqdefault.jpg';cover.alt=movie.title+' DVD cover';cover.loading='lazy';cover.style.cssText='max-width:100%;height:130px;object-fit:cover';const title=document.createElement('strong');title.textContent=movie.title;const label=document.createElement('small');label.textContent='▶ Play movie';button.append(cover,title,label);button.addEventListener('click',()=>{const url=document.getElementById('theater-youtube-url');const form=document.getElementById('theater-youtube-form');if(url&&form){url.value='https://www.youtube.com/watch?v='+movie.youtube_id;form.requestSubmit();}else{player.src='https://www.youtube-nocookie.com/embed/'+movie.youtube_id+'?autoplay=1';player.hidden=false;placeholder.hidden=true;}note.textContent='Now selected: '+movie.title;window.scrollTo({top:0,behavior:'smooth'});});shelf.append(button);}}
load().catch(()=>{});
