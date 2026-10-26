-- Disposable CI fixture only. All injected objects and data roll back.
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);

-- Fail after the function has inserted a daily claim and updated the wallet.
create function public.ci_reject_reward_transaction() returns trigger
language plpgsql as $$
begin
 raise exception 'Injected reward ledger failure' using errcode='23514';
end $$;
create trigger ci_reject_reward_transaction before insert on public.coin_transactions
for each row execute function public.ci_reject_reward_transaction();

set local role authenticated;
do $$
begin
 begin
  perform public.claim_daily_cartoon_coins();
  raise exception 'Injected failure unexpectedly succeeded';
 exception when check_violation then
  if SQLERRM <> 'Injected reward ledger failure' then raise; end if;
 end;
 if (select balance from public.coin_wallets where user_id=auth.uid()) is distinct from 100::bigint
    or exists(select 1 from public.coin_transactions where user_id=auth.uid())
    or exists(select 1 from public.coin_daily_claims where user_id=auth.uid()) then
  raise exception 'Failed reward left a balance, ledger, or daily-claim change';
 end if;
end $$;
reset role;
drop trigger ci_reject_reward_transaction on public.coin_transactions;

-- A rolled-back failure must not consume the day's reward.
set local role authenticated;
do $$
declare result jsonb;
begin
 result:=public.claim_daily_cartoon_coins();
 if (result->>'awarded') is distinct from '25'
    or (result->>'balance') is distinct from '125' then
  raise exception 'Reward did not recover after ledger failure: %',result;
 end if;
end $$;
reset role;
rollback;
