import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../server/owner-verification.mjs',import.meta.url),'utf8');
const gateway=readFileSync(new URL('../server/gateway-candidate.mjs',import.meta.url),'utf8');

test('owner session supports cross-site email recovery navigation without removing owner authorization',()=>{
 assert.match(source,/__Host-cu_owner_verify/);
 assert.match(source,/Path=\/; HttpOnly; SameSite=Lax; Max-Age=\$\{age\}; Secure/);
 assert.doesNotMatch(source,/SameSite=None/);
 assert.match(source,/session\.expires>now\(\)/);
 assert.match(source,/await owner\(session\.token\)/);
 assert.match(gateway,/await verifyOwner\.authorized\(req\)/);
 assert.match(gateway,/Owner verification required/);
});
