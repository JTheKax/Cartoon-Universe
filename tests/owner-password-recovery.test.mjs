import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../server/owner-verification.mjs',import.meta.url),'utf8');
const client=readFileSync(new URL('../server/password-recovery-client.js',import.meta.url),'utf8');
test('recovery remains outside arcade gate and uses separate public route',()=>{
 assert.match(server,/__maintenance\/password-recovery/);
 assert.match(server,/RECOVERY_HTML/);
 assert.match(server,/readFileSync\(new URL\('\.\/password-recovery-client\.js'/);
});
test('recovery accepts supported token formats and clears URL',()=>{
 assert.match(client,/verifyOtp/);
 assert.match(client,/exchangeCodeForSession/);
 assert.match(client,/setSession/);
 assert.match(client,/history\.replaceState/);
 assert.match(client,/updateUser/);
 assert.match(client,/password\.value=''/);
 assert.doesNotMatch(client,/service_role|maintenance_controls|coin_wallets/);
});
