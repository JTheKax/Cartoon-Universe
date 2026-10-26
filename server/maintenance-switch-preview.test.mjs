import test from 'node:test';
import assert from 'node:assert/strict';
import {createMaintenanceSwitchPreview} from './maintenance-switch-preview.mjs';
const owner={role:'owner',isAnonymous:false};
const make=(options={})=>createMaintenanceSwitchPreview({
 verifyOwner:async()=>owner,readState:async()=>({enabled:true,revision:1}),
 checkRouting:async()=>true,releaseApproved:async()=>true,...options
});
const req={method:'POST',origin:'https://example.org',expectedOrigin:'https://example.org',csrfValid:true,requested:false,expectedRevision:1};
test('owner gets read-only approved preview',async()=>assert.deepEqual(await make()(req),{status:200,body:{allowed:true,reason:'Authorized transition candidate',previewOnly:true,changed:false}}));
test('reject cross-origin and CSRF failure',async()=>{assert.equal((await make()({...req,origin:'https://other.org'})).status,403);assert.equal((await make()({...req,csrfValid:false})).status,403)});
test('deny nonowner',async()=>assert.equal((await make({verifyOwner:async()=>({role:'player'})})(req)).status,403));
test('fail closed on routing outage',async()=>assert.equal((await make({checkRouting:async()=>{throw Error('down')}})(req)).status,503));
test('no release approval denies OFF',async()=>assert.equal((await make({releaseApproved:async()=>false})(req)).body.allowed,false));
test('preview never writes state',async()=>assert.equal((await make()(req)).body.changed,false));
