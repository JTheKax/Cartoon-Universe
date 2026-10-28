// Isolated owner gateway adapter: mounts preview only when explicitly enabled.
// No production writes, deploys, or state mutation.
import {createMaintenanceControlHandler} from './maintenance-control-handler.mjs';
export function createOwnerMaintenancePreviewRoute({
 ownerVerification,readState,checkRouting,releaseApproved,siteOrigin,validateCsrf
}={}){
 if(typeof ownerVerification?.authorized!=='function')throw Error('Owner verification required');
 if(typeof validateCsrf!=='function')throw Error('CSRF verifier required');
 const handler=createMaintenanceControlHandler({
  siteOrigin,
  validateCsrf,
  verifyOwner:async request=>{
   // Verify the same HttpOnly owner session used for protected arcade access.
   const valid=await ownerVerification.authorized({headers:request.headers});
   return valid?{role:'owner',isAnonymous:false}:null;
  },
  readState,checkRouting,releaseApproved
 });
 return async(req,res)=>{
  if(req.url?.split('?')[0]!=='/__maintenance/control/preview')return false;
  await handler(req,res);
  return true;
 };
}
