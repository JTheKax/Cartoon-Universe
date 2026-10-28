// Isolated composition harness for section maintenance. NOT a production entry point.
// It serves only injected test handlers; no files, credentials, or real mutations.
// A future production integration must independently verify every actual route.
import {createServer} from 'node:http';
import {createSectionMaintenanceGatewayAdapter} from './section-maintenance-gateway-adapter.mjs';
import {guardSectionRoute,sectionForRoute} from './section-route-guard.mjs';
import {normalizeSectionStatuses} from './section-maintenance-store.mjs';

export function createSectionMaintenanceReviewGateway({origin,loadSnapshot,verifyOwner,saveChange,servePage,performMutation}={}){
 if(typeof loadSnapshot!=='function'||typeof verifyOwner!=='function'
    ||typeof servePage!=='function'||typeof performMutation!=='function')
  throw new Error('All trusted server-side handlers are required');
 const change=createSectionMaintenanceGatewayAdapter({origin,verifyOwner,saveChange});
 return createServer(async(req,res)=>{
  const send=(status,body,extra={})=>{
   res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra});
   res.end(req.method==='HEAD'?undefined:JSON.stringify(body));
  };
  try{
   if(await change(req,res))return;
   const pathname=typeof req.url==='string'?req.url.split('?')[0]:'';
   const section=sectionForRoute({pathname,method:req.method});
   if(!section)return send(404,{error:'route-not-registered'});
   // Snapshot retrieval is required for every page and mutation, including
   // owner bypass. An outage never opens an unverified route.
   let snapshot;
   try{snapshot=await loadSnapshot();}catch{return send(503,{error:'maintenance-state-unavailable'});}
   if(snapshot?.globalMaintenance!==true&&snapshot?.globalMaintenance!==false)
    return send(503,{error:'maintenance-state-unavailable'});
   const sectionStatuses=normalizeSectionStatuses(snapshot.sectionRows);
   let identity;
   try{identity=await verifyOwner(req);}catch{identity=null;}
   const verifiedOwner=identity?.verified===true&&typeof identity.userId==='string'&&identity.userId.length>0;
   const decision=guardSectionRoute({pathname,method:req.method,
    globalMaintenance:snapshot.globalMaintenance,sectionStatuses,verifiedOwner});
   if(!decision.allowed)return send(503,{error:'section-unavailable',reason:decision.reason},{'Retry-After':'60'});
   const handler=['GET','HEAD'].includes(req.method)?servePage:performMutation;
   const result=await handler({pathname,method:req.method,section,ownerId:verifiedOwner?identity.userId:null,req});
   if(!result||!Number.isInteger(result.status)||result.status<200||result.status>599)
    return send(503,{error:'handler-unavailable'});
   return send(result.status,result.body??{ok:true});
  }catch{return send(503,{error:'gateway-unavailable'});}
 });
}
