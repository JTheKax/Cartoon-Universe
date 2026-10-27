import {SECTION_KEYS} from './section-maintenance-policy.mjs';

const keys=new Set(SECTION_KEYS);
// Converts untrusted database rows to a server-only policy snapshot.
// Any missing, duplicated, or malformed row is treated as maintenance ON.
// This module never writes database state and is not wired into production.
export function normalizeSectionStatuses(rows){
 const statuses=Object.fromEntries(SECTION_KEYS.map(key=>[key,true]));
 if(!Array.isArray(rows))return Object.freeze(statuses);
 const seen=new Set();
 for(const row of rows){
  if(!row||typeof row!=='object'||!keys.has(row.section_key))continue;
  const key=row.section_key;
  if(seen.has(key)){statuses[key]=true;continue;}
  seen.add(key);
  statuses[key]=row.maintenance_enabled===false?false:true;
 }
 // Duplicate records must not accidentally re-open a section.
 const counts=new Map();
 for(const row of rows)if(row&&keys.has(row.section_key))counts.set(row.section_key,(counts.get(row.section_key)||0)+1);
 for(const [key,count] of counts)if(count>1)statuses[key]=true;
 return Object.freeze(statuses);
}
