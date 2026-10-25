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

test('reward guard is tested from the exact review-only migration in isolated CI',()=>{
 const generator=file('scripts/build-maintenance-reward-ci.mjs');
 const workflow=file('.github/workflows/validate.yml');
 assert.match(generator,/site_maintenance/);
 assert.match(generator,/owner_members/);
 assert.match(generator,/claim_daily_cartoon_coins|cartoon_coin_daily_reward/);
 assert.match(workflow,/postgres:17/);
 assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f supabase\/maintenance-daily-reward-guard\.sql/);
 assert.doesNotMatch(workflow,/node scripts\/build-maintenance-reward-ci\.mjs/);
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

test('maintenance reward guard is inserted after authentication and before wallet writes',()=>{
 const original=file('sql/cartoon_coin_daily_reward.sql');
 const generator=file('scripts/build-maintenance-reward-ci.mjs');
 const auth=original.indexOf('if player_id is null');
 const wallet=original.indexOf('insert into public.coin_wallets');
 const marker=original.indexOf('-- The wallet row is the per-user lock;');
 assert.ok(auth>=0 && wallet>auth && marker>auth && marker<wallet);
 assert.match(generator,/original\.replace\(marker,guard\+marker\)/);
 assert.match(generator,/enabled=true/);
 assert.match(generator,/not exists\(select 1 from public\.owner_members/);
 assert.match(generator,/errcode='P0001'/);
});
test('no client-side maintenance switch can write the enabled flag',()=>{
 const js=file('maintenance-controls.js');
 assert.doesNotMatch(js,/update\(\{[^}]*enabled\s*:/);
 assert.match(js,/toggle\.disabled=true/);
});

test('review-only migration preserves the complete reward function and inserts guard before wallet writes',()=>{
 const base=file('sql/cartoon_coin_daily_reward.sql');
 const migration=file('supabase/maintenance-daily-reward-guard.sql');
 const marker='  -- The wallet row is the per-user lock;';
 const guardStart=migration.indexOf('  -- Maintenance is enforced inside');
 const guardEnd=migration.indexOf(marker,guardStart);
 assert.ok(guardStart>=0 && guardEnd>guardStart);
 const preamble='-- REVIEW-ONLY MIGRATION: do not apply to production until full maintenance gating is approved.\n-- Exact existing daily reward function retained with a guard inserted before wallet writes.\n-- Run only in disposable staging first. Keep production maintenance OFF.\n';
 const restored=migration.slice(preamble.length,guardStart)+migration.slice(guardEnd);
 assert.equal(restored,base);
 assert.match(preamble,/REVIEW-ONLY MIGRATION/);
 assert.match(migration.slice(guardStart,guardEnd),/site_maintenance/);
 assert.match(migration.slice(guardStart,guardEnd),/owner_members/);
 assert.match(migration.slice(guardStart,guardEnd),/errcode = 'P0001'/);
});

test('release checklist requires complete reward rollback verification',()=>{
 const checks=file('tests/maintenance-checks.md');
 const reward=file('sql/tests/maintenance_reward_guard_test.sql');
 assert.match(checks,/daily-claim history/);
 assert.match(reward,/before_state is distinct from after_state/);
 for (const table of ['coin_wallets','coin_transactions','coin_daily_claims'])
  assert.match(reward,new RegExp('from public\\.'+table));
 assert.match(reward,/set local role authenticated/);
 assert.match(reward,/00000000-0000-0000-0000-000000000003/);
});
