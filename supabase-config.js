// HTTPS for hosted projects; one explicit loopback endpoint for local Supabase.
export function isSupabaseConfigured(value,key){
 if(typeof key!=='string'||key.length<=30)return false;
 try{
  const url=new URL(value);
  if(url.href.replace(/\/$/,'')!==url.origin)return false;
  return url.protocol==='https:'||url.origin==='http://127.0.0.1:54321';
 }catch{return false;}
}
