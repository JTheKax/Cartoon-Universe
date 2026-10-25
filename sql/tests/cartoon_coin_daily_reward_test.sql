-- Manual integration test: run ONLY on a disposable/staging Supabase database.
-- The entire test is rolled back. Do not run against live player accounts.
-- Precondition: migration applied; one disposable auth.users row with wallet exists.
-- Replace 00000000-0000-0000-0000-000000000001 with that test user's UUID.
begin;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $$
declare
  uid uuid := '00000000-0000-0000-0000-000000000001';
  before_balance bigint;
  after_balance bigint;
  first_result jsonb;
  second_result jsonb;
  rewards_before integer;
  rewards_after integer;
begin
  select balance into before_balance from public.coin_wallets where user_id=uid;
  if before_balance is null then raise exception 'Missing disposable test wallet'; end if;
  select count(*) into rewards_before from public.coin_transactions
   where user_id=uid and reason='daily_reward';
  first_result := public.claim_daily_cartoon_coins();
  second_result := public.claim_daily_cartoon_coins();
  select balance into after_balance from public.coin_wallets where user_id=uid;
  select count(*) into rewards_after from public.coin_transactions
   where user_id=uid and reason='daily_reward';
  if (second_result->>'claimed')::boolean then raise exception 'Duplicate daily reward accepted'; end if;
  if (second_result->>'awarded')::int <> 0 then raise exception 'Duplicate reward credited'; end if;
  if (first_result->>'claimed')::boolean then
    if after_balance <> before_balance+25 or rewards_after <> rewards_before+1 then
      raise exception 'First claim was not atomically credited and logged';
    end if;
  elsif after_balance <> before_balance or rewards_after <> rewards_before then
    raise exception 'Already claimed user balance changed';
  end if;
end;
$$;
rollback;

-- Additional staging-only checks:
-- 1. Call RPC as anon: permission denied.
-- 2. Call RPC as a signed-in anonymous Supabase user: rejected.
-- 3. Fire two concurrent authenticated RPC requests for same user:
--    exactly one claimed=true, one claimed=false, and total credit = 25.
-- 4. Verify user A cannot select user B's wallet, claims, or transactions.
-- 5. Verify authenticated clients cannot INSERT/UPDATE/DELETE wallets,
--    claims or transaction rows through the Data API.
-- 6. Compare wallet balances before/after applying the migration (unchanged).
-- 7. Verify a failed transaction insert rolls back the claim and balance.
