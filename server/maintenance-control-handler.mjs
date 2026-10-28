// Candidate maintenance-control HTTP endpoint. Inert until mounted by a server.
// This endpoint NEVER performs a production write or deployment.
import {createMaintenanceSwitchPreview} from './maintenance-switch-preview.mjs';
export function createMaintenanceControlHandler(dependencies){
 const preview=createMaintenanceSwitchPreview(dependencies);
 return async function handle(req,res){
  const respond=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  if(req.method!=='POST')return respond(405,{allowed:false,reason:'POST required'});
  if(req.headers['content-type']!=='application/json')return respond(415,{allowed:false,reason:'JSON required'});
  const length=Number(req.headers['content-length']);
  if(!Number.isSafeInteger(length)||length<2||length>1024||req.headers['transfer-encoding'])
   return respond(413,{allowed:false,reason:'Invalid request size'});
  let body='';
  try{
   for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1024)return respond(413,{allowed:false,reason:'Request too large'});}
   if(Buffer.byteLength(body)!==length)return respond(400,{allowed:false,reason:'Request length mismatch'});
   const parsed=JSON.parse(body);
   if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')return respond(400,{allowed:false,reason:'Invalid request'});
   const result=await preview({
    method:'POST',origin:req.headers.origin,expectedOrigin:dependencies.siteOrigin,
    csrfValid:await dependencies.validateCsrf(req),requested:parsed.requested,
    expectedRevision:parsed.expectedRevision,headers:req.headers
   });
   return respond(result.status,result.body);
  }catch{return respond(400,{allowed:false,reason:'Invalid request'});}
 };
}
