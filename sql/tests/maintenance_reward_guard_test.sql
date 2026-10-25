-- Disposable CI only. Verifies maintenance guard without altering production.
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
update public.site_maintenance set enabled=true where id=true;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare before_balance bigint; after_balance bigint; n integer; claims_before integer; claims_after integer;
begin
 select balance into before_balance from public.coin_wallets where user_id='00000000-0000-0000-0000-000000000001';
 select count(*) into claims_before from public.coin_daily_claims where user_id='00000000-0000-0000-0000-000000000001';
 begin
  perform public.claim_daily_cartoon_coins();
  raise exception 'Nonowner claim unexpectedly succeeded under maintenance';
 exception when sqlstate 'P0001' then
  if SQLERRM <> 'Cartoon Universe is temporarily under maintenance' then raise; end if;
 end;
 select balance into after_balance from public.coin_wallets where user_id='00000000-0000-0000-0000-000000000001';
 select count(*) into n from public.coin_transactions where user_id='00000000-0000-0000-0000-000000000001' and reason='daily_reward';
 select count(*) into claims_after from public.coin_daily_claims where user_id='00000000-0000-0000-0000-000000000001';
 if before_balance<>after_balance or n<>0 or claims_before<>claims_after then raise exception 'Blocked claim modified player funds or history'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$
declare result jsonb;
begin
 result:=public.claim_daily_cartoon_coins();
 if result->>'awarded'<>'25' then raise exception 'Owner bypass failed: %',result; end if;
end $$;
update public.site_maintenance set enabled=false where id=true;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare result jsonb;
begin
 result:=public.claim_daily_cartoon_coins();
 if result->>'awarded'<>'25' then raise exception 'Maintenance OFF claim failed: %',result; end if;
end $$;
rollback;
