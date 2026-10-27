// Review-only public Supabase snapshot reader. No production route is wired here.
// Uses only a publishable key; never accepts a service-role or secret key.
export function createSectionMaintenanceSupabaseReader({supabaseUrl,publishableKey,fetchImpl=fetch}){
 let base;
 try{base=new URL(supabaseUrl);}catch{throw new Error('Valid Supabase HTTPS origin required');}
 if(base.protocol!=='https:'||base.username||base.password||base.href!==base.origin+'/'
    ||!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(publishableKey||'')
    ||typeof fetchImpl!=='function')throw new Error('HTTPS origin and publishable key required');
 const get=async path=>{
  const response=await fetchImpl(base.origin+path,{
   method:'GET',headers:{apikey:publishableKey,Accept:'application/json'},
   redirect:'error',signal:AbortSignal.timeout(3000)
  });
  if(!response?.ok)throw new Error('Maintenance snapshot unavailable');
  const rows=await response.json();
  if(!Array.isArray(rows))throw new Error('Invalid maintenance response');
  return rows;
 };
 return async function loadSnapshot(){
  const [globalRows,sectionRows]=await Promise.all([
   get('/rest/v1/site_maintenance?select=enabled&id=eq.true'),
   get('/rest/v1/section_maintenance?select=section_key,maintenance_enabled')
  ]);
  if(globalRows.length!==1||typeof globalRows[0]?.enabled!=='boolean')
   throw new Error('Missing global maintenance state');
  return {globalMaintenance:globalRows[0].enabled,sectionRows};
 };
}
