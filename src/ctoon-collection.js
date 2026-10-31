// Per-player published Ctoon collection. Browser is read-only; RLS enforces ownership.
export async function loadCtoonCollection(supabase) {
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError) throw authError;
  const user=auth?.user ?? null;
  const {data:stickers,error:catalogError}=await supabase.from('ctoon_sticker_catalog').select('id,series,subseries,sticker_code,title,artwork_url').eq('published',true).order('series').order('title');
  if(catalogError) throw catalogError;
  const quantities=new Map();
  if(user){
    const {data:rows,error:ownershipError}=await supabase.from('ctoon_sticker_ownership').select('sticker_id,quantity').eq('user_id',user.id);
    if(ownershipError) throw ownershipError;
    for(const row of rows??[]){
      const quantity=Number(row.quantity);
      if(Number.isSafeInteger(quantity)&&quantity>0) quantities.set(row.sticker_id,quantity);
    }
  }
  const items=(stickers??[]).map(sticker=>{
    const quantity=quantities.get(sticker.id)??0;
    return {...sticker,quantity,duplicates:Math.max(0,quantity-1),status:quantity>0?'Owned':'Need'};
  });
  const ownedCount=items.filter(item=>item.quantity>0).length;
  const totalCopies=items.reduce((sum,item)=>sum+item.quantity,0);
  return {authenticated:!!user,items,ownedCount,needCount:items.length-ownedCount,totalCopies,duplicateCount:totalCopies-ownedCount,completionPercent:items.length?Math.round(ownedCount/items.length*100):0};
}
