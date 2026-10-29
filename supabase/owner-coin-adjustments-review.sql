-- Owner-only atomic Cartoon Coin adjustment. Apply only after isolated verification.
create or replace function public.owner_adjust_cartoon_coins(
 p_username text, p_amount bigint, p_reason text
) returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare
 v_target uuid;
 v_balance bigint;
begin
 if auth.uid() is null or not exists (
  select 1 from public.owner_members where user_id = auth.uid()
 ) then raise exception 'Owner permission required' using errcode='42501'; end if;
 if p_username is null or length(btrim(p_username)) < 1 or length(p_username)>20
    or p_amount is null or p_amount=0 or p_amount < -1000000 or p_amount > 1000000
    or p_reason is null or length(btrim(p_reason))<3 or length(p_reason)>120
 then raise exception 'Invalid adjustment input'; end if;
 select id into strict v_target from public.profiles where username=p_username;
 select balance into strict v_balance from public.coin_wallets
 where user_id=v_target for update;
 if p_amount < 0 and v_balance < -p_amount then
  raise exception 'Insufficient Cartoon Coins';
 end if;
 if p_amount > 0 and v_balance > 9223372036854775807 - p_amount then
  raise exception 'Cartoon Coin balance overflow';
 end if;
 update public.coin_wallets set balance=v_balance+p_amount,updated_at=now()
 where user_id=v_target;
 insert into public.coin_transactions(user_id,amount,reason)
 values(v_target,p_amount,'Owner adjustment: '||btrim(p_reason));
 return v_balance+p_amount;
end;
$$;
revoke all on function public.owner_adjust_cartoon_coins(text,bigint,text) from public,anon;
grant execute on function public.owner_adjust_cartoon_coins(text,bigint,text) to authenticated;
