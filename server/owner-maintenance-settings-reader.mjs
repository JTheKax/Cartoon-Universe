// Review-only authenticated maintenance settings reader; no write capability.
import {PUBLIC_FEATURES,resolvePublicFeatureStatus} from '../deploy/feature-status-preview/public-feature-status.mjs';
export function createOwnerMaintenanceSettingsReader({verifyOwner,readRoutingState}={}){
 if(typeof verifyOwner!=='function'||typeof readRoutingState!=='function')throw Error('Verification and routing reader required');
 return async function handle(req,res){
  const respond=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body))};
  if(req.method!=='GET')return respond(405,{error:'GET required'});
  try{
   if(await verifyOwner(req)!==true)return respond(403,{error:'Verified owner required'});
   const state=await readRoutingState(req);
   if(!state||state.routingConfirmed!==true)return respond(503,{error:'Routing state unconfirmed'});
   const features=resolvePublicFeatureStatus({...state,features:PUBLIC_FEATURES});
   return respond(200,{readOnly:true,masterMaintenance:state.masterMaintenance===true,features:features.map(({id,label,status})=>({id,label,status}))});
  }catch{return respond(503,{error:'Maintenance settings unavailable'})}
 };
}
