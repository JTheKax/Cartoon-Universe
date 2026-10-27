// Review-only transactional persistence contract, not connected to production.
// The supplied database adapter must execute update and audit in one transaction.
export function createSectionMaintenanceTransaction({transaction}){
 if(typeof transaction!=='function')throw new Error('Transactional database adapter required');
 return async function saveChange({section,maintenanceEnabled,ownerId}){
  if(typeof section!=='string'||typeof maintenanceEnabled!=='boolean'||typeof ownerId!=='string'||!ownerId)
   throw new Error('Invalid maintenance change');
  const result=await transaction(async tx=>{
   if(typeof tx?.updateSection!=='function'||typeof tx?.insertAudit!=='function')throw new Error('Incomplete transaction adapter');
   const updated=await tx.updateSection({section,maintenanceEnabled,ownerId});
   if(updated?.updated!==true)throw new Error('Section update unconfirmed');
   const audited=await tx.insertAudit({section,maintenanceEnabled,ownerId});
   if(audited?.inserted!==true)throw new Error('Audit insert unconfirmed');
   return {saved:true,audited:true};
  });
  if(result?.saved!==true||result?.audited!==true)throw new Error('Transaction unconfirmed');
  return result;
 };
}
