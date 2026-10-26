-- Disposable CI only. Verifies maintenance guard without altering production.
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
update public.site_maintenance set enabled=true where id=true;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
-- Check both an existing wallet and a disposable account with no wallet.
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000003');
set local role authenticated;
do $$
declare
 player uuid;
 before_state jsonb;
 after_state jsonb;
begin
 foreach player in array array[
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid
 ] loop
  perform set_config('request.jwt.claim.sub',player::text,true);
  select jsonb_build_object(
   'wallets',(select coalesce(jsonb_agg(to_jsonb(w) order by user_id),'[]'::jsonb) from public.coin_wallets w where user_id=player),
   'transactions',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.coin_transactions t where user_id=player),
   'claims',(select coalesce(jsonb_agg(to_jsonb(c) order by reward_date),'[]'::jsonb) from public.coin_daily_claims c where user_id=player)
  ) into before_state;
  begin
   perform public.claim_daily_cartoon_coins();
   raise exception 'Nonowner claim unexpectedly succeeded under maintenance';
  exception when sqlstate 'P0001' then
   if SQLERRM <> 'Cartoon Universe is temporarily under maintenance' then raise; end if;
  end;
  select jsonb_build_object(
   'wallets',(select coalesce(jsonb_agg(to_jsonb(w) order by user_id),'[]'::jsonb) from public.coin_wallets w where user_id=player),
   'transactions',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.coin_transactions t where user_id=player),
   'claims',(select coalesce(jsonb_agg(to_jsonb(c) order by reward_date),'[]'::jsonb) from public.coin_daily_claims c where user_id=player)
  ) into after_state;
  if before_state is distinct from after_state then
   raise exception 'Blocked claim modified player funds or history for %',player;
  end if;
 end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$
declare result jsonb;
begin
 result:=public.claim_daily_cartoon_coins();
 if (result->>'awarded') is distinct from '25' then raise exception 'Owner bypass failed: %',result; end if;
end $$;
update public.site_maintenance set enabled=false where id=true;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare result jsonb;
begin
 result:=public.claim_daily_cartoon_coins();
 if (result->>'awarded') is distinct from '25' then raise exception 'Maintenance OFF claim failed: %',result; end if;
end $$;
rollback;
