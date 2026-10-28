// Isolated HTTP adapter. No live listener, deployment, or writes.
import {decidePublicRoute} from './public-maintenance-router.mjs';
export function createPublicMaintenanceHttpHandler({readRoutingState,verifyOwner=async()=>false,servePublic,serveOwnerPreview,serveMaintenance}={}){
 if([readRoutingState,servePublic,serveOwnerPreview,serveMaintenance].some(fn=>typeof fn!=='function'))throw Error('Routing and response dependencies required');
 return async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  let state={};
  try{state=await readRoutingState(req)||{}}catch{state={};}
  let ownerVerified=false;
  try{ownerVerified=await verifyOwner(req)===true}catch{}
  let pathname='/';
  try{pathname=new URL(req.url,'https://review.invalid').pathname}catch{pathname='invalid';}
  const decision=decidePublicRoute({...state,pathname,ownerVerified});
  // Never fall through to public content if a handler errors.
  try{
   if(decision.action==='public')return await servePublic(req,res,decision);
   if(decision.action==='owner_preview')return await serveOwnerPreview(req,res,decision);
  }catch{}
  return serveMaintenance(req,res,{...decision,action:'maintenance'});
 };
}
