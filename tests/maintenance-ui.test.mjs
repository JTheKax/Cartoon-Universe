import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('maintenance activation remains locked pending full server gate',()=>{
 assert.match(file('owner.html'),/id="maintenance-toggle"[^>]*disabled/);
 assert.match(file('maintenance-controls.js'),/toggle\.disabled=true/);
});
test('owner identity is included when saving notice',()=>{
 const js=file('maintenance-controls.js');
 assert.match(js,/updated_by:user\.id/);
 assert.match(js,/select\('id,message'\)\.maybeSingle\(\)/);
});
test('advisory notice included on four player pages',()=>{
 for(const page of ['index.html','login.html','register.html','coin-wallet.html'])
  assert.match(file(page),/src="maintenance-notice\.js"/);
});
test('notice avoids HTML injection and checks owner membership',()=>{
 const js=file('maintenance-notice.js');
 assert.match(js,/message\.textContent=/);
 assert.match(js,/from\('owner_members'\)/);
 assert.doesNotMatch(js,/innerHTML/);
});

test('maintenance SQL audit is read-only',()=>{
 const sql=file('sql/tests/maintenance_readonly_audit.sql').replace(/--[^\n]*/g,'');
 assert.doesNotMatch(sql,/\b(?:insert|update|delete|alter|drop|truncate|create)\b/i);
 assert.match(sql,/pg_policies/);
 assert.match(sql,/role_table_grants/);
});

test('maintenance editor clears stale owner authorization on reload',()=>{
 const js=file('maintenance-controls.js');
 assert.match(js,/async function load\(\)\{\s*verifiedOwnerId=null;/);
 assert.match(js,/save\.disabled=true;\s*toggle\.disabled=true;/);
});

test('reward guard is generated only for isolated CI and protects nonowners',()=>{
 const generator=file('scripts/build-maintenance-reward-ci.mjs');
 const workflow=file('.github/workflows/validate.yml');
 assert.match(generator,/site_maintenance/);
 assert.match(generator,/owner_members/);
 assert.match(generator,/claim_daily_cartoon_coins|cartoon_coin_daily_reward/);
 assert.match(workflow,/postgres:17/);
 assert.match(workflow,/maintenance_reward_guard_test\.sql/);
 assert.match(workflow,/maintenance_rls_test\.sql/);
});
test('release documents remaining server and static-hosting gaps',()=>{
 const checks=file('tests/maintenance-checks.md');
 assert.match(checks,/server\/edge gateway/i);
 assert.match(checks,/purchases, trades, auctions/i);
 assert.match(checks,/production maintenance OFF/i);
 assert.match(file('maintenance-notice.js'),/does not secure static assets/i);
});
