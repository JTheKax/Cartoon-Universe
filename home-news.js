import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const escapeUrl=(s)=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:null}catch{return null}};
const categories={announcement:'Latest Announcements',release:'New Releases',coming_soon:'Coming Soon'};
const container=document.getElementById('home-news-feed');
if(container){
 const render=(items)=>{
  container.replaceChildren();
  for(const [category,label] of Object.entries(categories)){
   const section=document.createElement('section');section.className='home-news-group';
   const h=document.createElement('h2');h.textContent=label;section.append(h);
   const matching=items.filter(x=>x.category===category);
   if(!matching.length){const p=document.createElement('p');p.textContent='No updates published yet.';section.append(p)}
   for(const item of matching){
    const article=document.createElement('article');article.className='home-news-item';
    if(item.image_url&&escapeUrl(item.image_url)){const img=document.createElement('img');img.src=escapeUrl(item.image_url);img.alt='';img.loading='lazy';img.style.cssText='max-width:100%;max-height:220px;object-fit:cover;border-radius:9px';article.append(img)}
    const title=document.createElement('h3');title.textContent=item.title;article.append(title);
    const desc=document.createElement('p');desc.textContent=item.description;article.append(desc);
    if(item.release_date){const d=document.createElement('small');d.textContent='Release date: '+item.release_date;article.append(d)}
    if(item.link_url&&escapeUrl(item.link_url)){const a=document.createElement('a');a.href=escapeUrl(item.link_url);a.textContent='Read more';a.rel='noopener noreferrer';article.append(a)}
    section.append(article);
   }
   container.append(section);
  }
 };
 const {data,error}=await db.from('home_news').select('category,title,description,image_url,link_url,release_date,created_at').eq('published',true).order('created_at',{ascending:false}).limit(60);
 if(error){container.textContent='News is temporarily unavailable.';console.warn('News load failed',error.message)}
 else render(data||[]);
}
const form=document.getElementById('owner-news-form');
if(form){
 const message=document.getElementById('owner-news-status'),list=document.getElementById('owner-news-list');
 const {data:{user}}=await db.auth.getUser();
 let authorized=false;
 if(user){const {data}=await db.from('owner_members').select('user_id').eq('user_id',user.id).maybeSingle();authorized=!!data}
 if(!authorized){message.textContent='Owner authentication required.';form.hidden=true}
 else {
  const refresh=async()=>{
   const {data,error}=await db.from('home_news').select('*').order('created_at',{ascending:false}).limit(100);
   list.replaceChildren();
   if(error){message.textContent='Unable to load posts: '+error.message;return}
   for(const item of data||[]){
    const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px;border-bottom:1px solid #665';
    const name=document.createElement('span');name.textContent=(item.published?'Published: ':'Draft: ')+item.title;
    const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';edit.onclick=()=>{
     for(const key of ['category','title','description','image_url','link_url','release_date'])form.elements[key].value=item[key]||'';
     form.elements.published.checked=item.published;form.elements.post_id.value=item.id;form.scrollIntoView({behavior:'smooth'});
    };
    const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';remove.onclick=async()=>{
     if(!confirm('Delete this announcement?'))return;
     const {error}=await db.from('home_news').delete().eq('id',item.id);
     message.textContent=error?error.message:'Post deleted';if(!error)refresh();
    };
    row.append(name,edit,remove);list.append(row);
   }
  };
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   const el=form.elements;const payload={category:el.category.value,title:el.title.value.trim(),description:el.description.value.trim(),image_url:el.image_url.value.trim()||null,link_url:el.link_url.value.trim()||null,release_date:el.release_date.value||null,published:el.published.checked};
   if((payload.image_url&&!escapeUrl(payload.image_url))||(payload.link_url&&!escapeUrl(payload.link_url))){message.textContent='Links must use HTTPS';return}
   const id=el.post_id.value;
   const {error}=id?await db.from('home_news').update(payload).eq('id',id):await db.from('home_news').insert(payload);
   message.textContent=error?'Save failed: '+error.message:'Saved successfully';
   if(!error){form.reset();el.post_id.value='';refresh()}
  });
  document.getElementById('owner-news-new').onclick=()=>{form.reset();form.elements.post_id.value=''};
  refresh();
 }
}
