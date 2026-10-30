// Review-only public Supabase snapshot reader. No production route is wired here.
// One security-invoker RPC reads global and section status in one MVCC snapshot.
// Uses only a publishable key; never accepts a service-role or secret key.
import {isCompleteSectionSnapshot} from './section-maintenance-store.mjs';
export function createSectionMaintenanceSupabaseReader({supabaseUrl,publishableKey,fetchImpl=fetch}){
 let base;
 try{base=new URL(supabaseUrl);}catch{throw new Error('Valid Supabase HTTPS origin required');}
 if(base.protocol!=='https:'||base.username||base.password||base.href!==base.origin+'/'
    ||!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(publishableKey||'')
    ||typeof fetchImpl!=='function')throw new Error('HTTPS origin and publishable key required');
 return async function loadSnapshot(){
  const response=await fetchImpl(base.origin+'/rest/v1/rpc/get_maintenance_snapshot',{
   method:'GET',headers:{apikey:publishableKey,Accept:'application/json'},
   redirect:'error',signal:AbortSignal.timeout(3000)
  });
  if(!response?.ok)throw new Error('Maintenance snapshot unavailable');
  const snapshot=await response.json();
  if(!snapshot||Array.isArray(snapshot)||typeof snapshot!=='object'
     ||typeof snapshot.globalMaintenance!=='boolean'
     ||!isCompleteSectionSnapshot(snapshot.sectionRows))
   throw new Error('Incomplete maintenance snapshot');
  return {globalMaintenance:snapshot.globalMaintenance,sectionRows:snapshot.sectionRows};
 };
}
