import {createSectionMaintenanceApi} from './section-maintenance-api.mjs';

// Review-only Node HTTP adapter. It is not mounted in the production gateway.
// The caller supplies server-side owner verification and transactional persistence.
export function createSectionMaintenanceGatewayAdapter({origin,verifyOwner,saveChange}){
 const api=createSectionMaintenanceApi({origin,verifyOwner,saveChange});
 return async function handle(req,res){
  const send=(status,body)=>{
   res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
   res.end(JSON.stringify(body));
  };
  if(req.url?.split('?')[0]!=='/__maintenance/section-status')return false;
  if(req.method!=='POST'){send(405,{error:'method-not-allowed'});return true;}
  const length=Number(req.headers['content-length']);
  if((req.headers['content-length']!==undefined&&(!Number.isSafeInteger(length)||length<0||length>1024))||req.headers['transfer-encoding']){
   send(413,{error:'request-too-large'});return true;
  }
  let body='';
  try{
   for await(const chunk of req){body+=chunk.toString('utf8');if(Buffer.byteLength(body,'utf8')>1024){send(413,{error:'request-too-large'});return true;}}
  }catch{send(400,{error:'invalid-body'});return true;}
  const result=await api({method:req.method,headers:req.headers,body});
  send(result.status,result.body);
  return true;
 };
}
