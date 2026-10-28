import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./gateway-candidate.mjs',import.meta.url),'utf8');
test('candidate gateway includes opt-in owner settings reader',()=>{
 assert.match(source,/maintenanceSettingsPreview&&verifyOwner\?/);
 assert.match(source,/createOwnerMaintenanceSettingsReader/);
 assert.match(source,/verifyOwner\.authorized\(req\)/);
 assert.match(source,/path==='\/__maintenance\/owner\/settings-preview'/);
});
test('owner dashboard preview dependencies are available only through protected arcade allowlist',()=>{
 assert.match(source,/'maintenance-feature-review\.js'/);
 assert.match(source,/'deploy\/feature-status-preview\/public-feature-status\.mjs'/);
 assert.match(source,/if\(!verifyOwner\|\|!await verifyOwner\.authorized\(req\)\)/);
});
test('gateway main entry does not activate owner settings reader',()=>{
 assert.doesNotMatch(source,/createCandidateServer\(\{origin:process\.env\.CANDIDATE_SITE_ORIGIN[^;]*maintenanceSettingsPreview:/);
});
