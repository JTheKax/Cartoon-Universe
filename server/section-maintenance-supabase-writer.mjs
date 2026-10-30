// Review-only RPC writer. It is not mounted on any production route.
// The caller must obtain accessToken from a freshly verified server-side owner session.
// The RPC enforces auth.uid() membership and writes the audit row atomically.
import {validateSectionChange} from './section-maintenance-request.mjs';
export function createSectionMaintenanceSupabaseWriter({supabaseUrl,publishableKey,fetchImpl=fetch}){
 let base;
 try{base=new URL(supabaseUrl);}catch{throw new Error('Valid Supabase HTTPS origin required');}
 if(base.protocol!=='https:'||base.username||base.password||base.href!==base.origin+'/'
    ||!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(publishableKey||'')
    ||typeof fetchImpl!=='function')throw new Error('HTTPS origin and publishable key required');
 return async function saveChange({section,maintenanceEnabled,ownerId,accessToken}={}){
  const change=validateSectionChange({section,maintenanceEnabled});
  if(!change.ok||typeof ownerId!=='string'||!ownerId
     ||typeof accessToken!=='string'||accessToken.length<16||accessToken.length>8192)
   throw new Error('Verified owner session and valid change required');
  const response=await fetchImpl(base.origin+'/rest/v1/rpc/set_section_maintenance',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),
   headers:{apikey:publishableKey,Authorization:'Bearer '+accessToken,'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({p_section:section,p_enabled:maintenanceEnabled})
  });
  if(!response?.ok)throw new Error('Section maintenance RPC failed');
  const result=await response.json();
  if(result?.saved!==true||result?.audited!==true||result?.section!==section
     ||result?.maintenanceEnabled!==maintenanceEnabled)
   throw new Error('Section maintenance RPC acknowledgement invalid');
  return {saved:true,audited:true};
 };
}
