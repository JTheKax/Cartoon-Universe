-- Run on disposable PostgreSQL CI fixture ONLY; transaction rolls back.
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
do $$
declare
 a jsonb; b jsonb; balance_now bigint; reward_count integer;
begin
 a:=public.claim_daily_cartoon_coins();
 b:=public.claim_daily_cartoon_coins();
 select balance into balance_now from public.coin_wallets
  where user_id='00000000-0000-0000-0000-000000000001';
 select count(*) into reward_count from public.coin_transactions
  where user_id='00000000-0000-0000-0000-000000000001' and reason='daily_reward';
 if (a->>'claimed')::boolean is distinct from true or (a->>'awarded')::int<>25
    or (b->>'claimed')::boolean is distinct from false or (b->>'awarded')::int<>0
    or balance_now<>125 or reward_count<>1 then
   raise exception 'Daily reward first/duplicate claim invariant failed: %, % balance % count %',a,b,balance_now,reward_count;
 end if;
 if (select balance from public.coin_wallets where user_id='00000000-0000-0000-0000-000000000002')<>500 then
   raise exception 'Other player balance changed';
 end if;
end $$;
-- Validate exposed function privileges.
do $$
begin
 if has_function_privilege('anon','public.claim_daily_cartoon_coins()','EXECUTE') then
   raise exception 'Anonymous role can execute reward RPC';
 end if;
 if not has_function_privilege('authenticated','public.claim_daily_cartoon_coins()','EXECUTE') then
   raise exception 'Authenticated role cannot execute reward RPC';
 end if;
 if has_table_privilege('authenticated','public.coin_daily_claims','INSERT')
    or has_table_privilege('authenticated','public.coin_daily_claims','UPDATE')
    or has_table_privilege('authenticated','public.coin_daily_claims','DELETE') then
   raise exception 'Client can write daily claims';
 end if;
end $$;
-- Negative authentication checks on the disposable database only.
-- Failed RPC calls must not award Coins or create daily claims.
select set_config('request.jwt.claim.role','anon',true);
do $
begin
 begin
  perform public.claim_daily_cartoon_coins();
  raise exception 'Anonymous JWT role unexpectedly claimed Coins';
 exception when sqlstate '28000' then null;
 end;
end $;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
do $
begin
 begin
  perform public.claim_daily_cartoon_coins();
  raise exception 'Anonymous-user JWT unexpectedly claimed Coins';
 exception when sqlstate '28000' then null;
 end;
end $;
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
select set_config('request.jwt.claim.sub','',true);
do $
begin
 begin
  perform public.claim_daily_cartoon_coins();
  raise exception 'Missing user identity unexpectedly claimed Coins';
 exception when sqlstate '28000' then null;
 end;
end $;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role anon;
do $
begin
 begin
  perform public.claim_daily_cartoon_coins();
  raise exception 'Anonymous database role unexpectedly executed reward RPC';
 exception when insufficient_privilege then null;
 end;
end $;
reset role;
do $
declare reward_count integer; balance_now bigint;
begin
 select count(*) into reward_count from public.coin_transactions
  where user_id='00000000-0000-0000-0000-000000000001' and reason='daily_reward';
 select balance into balance_now from public.coin_wallets
  where user_id='00000000-0000-0000-0000-000000000001';
 if reward_count<>1 or balance_now<>125 then
  raise exception 'Rejected claims changed reward ledger or balance';
 end if;
end $;
-- Authenticated client RLS: can see only own rows.
set local role authenticated;
do $$
declare n integer;
begin
 select count(*) into n from public.coin_wallets;
 if n<>1 then raise exception 'Wallet RLS failed: % rows',n; end if;
 select count(*) into n from public.coin_daily_claims;
 if n<>1 then raise exception 'Claim RLS failed: % rows',n; end if;
end $$;
reset role;
rollback;
-- Failure injection and overlapping RPC sessions run in separate CI harnesses.
