import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerVerification} from '../server/owner-verification.mjs';
const origin='https://cartoon-universe-gateway.onrender.com';
const project='https://gjfyemvcrgrthbrlqqnz.supabase.co';
const publishableKey='sb_publishable_disposable_verification_key';
const userId='00000000-0000-0000-0000-000000000002';
const accessToken='mock_owner_access_token';

test('server-only identity resolver returns verified user and token without HTTP exposure',async()=>{
 let now=1000,member=true;
 const fetchImpl=async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:userId,is_anonymous:false});
  if(url.includes('/owner_members?'))return Response.json(member?[{user_id:userId}]:[]);
  throw Error('Unexpected upstream call');
 };
 const verification=createOwnerVerification({origin,supabaseUrl:project,publishableKey,fetchImpl,now:()=>now});
 let response;
 const send=(status,body,type,headers)=>{response={status,body,headers};};
 const request={url:'/__maintenance/verify-session',method:'POST',headers:{origin,authorization:'Bearer '+accessToken}};
 assert.equal(await verification(request,send),true);
 assert.equal(response.status,200);
 assert.ok(!response.body.includes(accessToken));
 const cookie=response.headers['Set-Cookie'].split(';')[0];
 const sessionRequest={headers:{cookie}};
 assert.deepEqual(await verification.identity(sessionRequest),{verified:true,userId,accessToken});
 assert.equal(await verification.authorized(sessionRequest),true);
 member=false;
 assert.deepEqual(await verification.identity(sessionRequest),{verified:false});
 assert.equal(await verification.authorized(sessionRequest),false);
 member=true;
 await verification(request,send);
 const newCookie=response.headers['Set-Cookie'].split(';')[0];
 now+=300001;
 assert.deepEqual(await verification.identity({headers:{cookie:newCookie}}),{verified:false});
});
test('missing session and forged browser role never produce owner identity',async()=>{
 const verification=createOwnerVerification({origin,supabaseUrl:project,publishableKey,fetchImpl:async()=>{throw Error('Must not fetch');}});
 assert.deepEqual(await verification.identity({headers:{'x-owner':'true'}}),{verified:false});
});
