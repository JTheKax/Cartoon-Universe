// Static migration contract checks; run with: node --test tests/cartoon-coins.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../sql/cartoon_coin_daily_reward.sql',import.meta.url),'utf8');
const client=readFileSync(new URL('../coin-wallet.js',import.meta.url),'utf8');
test('daily claims are keyed by user and UTC reward date',()=>{
 assert.match(sql,/reward_date date not null/);
 assert.match(sql,/primary key \(user_id, reward_date\)/);
 assert.match(sql,/now\(\) at time zone 'UTC'/);
 assert.doesNotMatch(sql,/create unique index[\s\S]*created_at at time zone/i);
});
test('award is server-defined, authenticated and atomic',()=>{
 assert.match(sql,/player_id uuid := auth\.uid\(\)/);
 assert.match(sql,/coalesce\(\(auth\.jwt\(\) ->> 'is_anonymous'\)::boolean, false\)/);
 assert.match(sql,/for update/);
 assert.match(sql,/on conflict \(user_id, reward_date\) do nothing/);
 assert.match(sql,/get diagnostics inserted_claims = row_count/);
 assert.match(sql,/set balance = balance \+ 25/);
 assert.match(sql,/values \(player_id, 25, 'daily_reward'\)/);
 assert.match(sql,/\bbegin;[\s\S]*commit;\s*$/);
});
test('RPC and claim tables do not allow client writes',()=>{
 assert.match(sql,/revoke all on function public\.claim_daily_cartoon_coins\(\) from public, anon, authenticated/);
 assert.match(sql,/grant execute on function public\.claim_daily_cartoon_coins\(\) to authenticated/);
 assert.match(sql,/alter table public\.coin_daily_claims enable row level security/);
 assert.match(sql,/revoke all on public\.coin_daily_claims from public, anon, authenticated/);
 assert.doesNotMatch(sql,/grant (insert|update|delete|all) on public\.coin_daily_claims to authenticated/i);
});
test('wallet client never submits arbitrary coin amount or target user',()=>{
 assert.match(client,/client\.rpc\('claim_daily_cartoon_coins'\)/);
 assert.doesNotMatch(client,/client\.from\('coin_wallets'\)\.(insert|update|upsert|delete)/);
});

test('wallet uses authoritative daily claim status, not truncated transaction history',()=>{
 assert.match(client,/from\('coin_daily_claims'\)/);
 assert.match(client,/eq\('reward_date',new Date\(\)\.toISOString\(\)\.slice\(0,10\)\)/);
 assert.match(client,/const already=Boolean\(dailyClaim\.data\)/);
 assert.doesNotMatch(client,/transactions\.data\?\.some\(/);
});
