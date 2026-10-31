// Per-user Ctoon collection reader. Requires an authenticated Supabase client.
// No ownership writes are permitted from the browser.
export async function loadCtoonCollection(supabase) {
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError) throw authError;
  const user=auth?.user ?? null;
  const {data:stickers,error:catalogError}=await supabase.from('ctoon_sticker_catalog').select('id,series,subseries,sticker_code,title,artwork_url').eq('published',true).order('series').order('title');
  if(catalogError)throw catalogError;
  let owned=new Set();
  if(user){
    const {data:rows,error:ownershipError}=await supabase.from('ctoon_sticker_ownership').select('sticker_id').eq('user_id',user.id);
    if(ownershipError)throw ownershipError;
    owned=new Set((rows??[]).map(row=>row.sticker_id));
  }
  const items=(stickers??[]).map(sticker=>({...sticker,status:owned.has(sticker.id)?'Owned':'Need'}));
  return {authenticated:!!user,items,ownedCount:items.filter(item=>item.status==='Owned').length,needCount:items.filter(item=>item.status==='Need').length};
}
