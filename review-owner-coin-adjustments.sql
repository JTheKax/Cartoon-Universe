create or replace function public.owner_adjust_cartoon_coins(p_username text,p_amount bigint,p_reason text)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare recipient uuid; current_balance bigint; new_balance bigint;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or
 not exists(select 1 from public.owner_members where user_id=auth.uid()) then
 raise exception 'Owner access required' using errcode='42501'; end if;
 if p_amount is null or p_amount=0 or p_amount < -1000000 or p_amount > 1000000 then
 raise exception 'Adjustment must be between -1000000 and 1000000, excluding zero'; end if;
 if p_reason is null or length(btrim(p_reason)) < 3 or length(p_reason)>120 then
 raise exception 'Reason must be 3 to 120 characters'; end if;
 if p_username is null or length(btrim(p_username))<1 then
 raise exception 'Username required'; end if;
 select id into recipient from public.profiles where lower(username)=lower(btrim(p_username));
 if recipient is null then raise exception 'Player not found'; end if;
 insert into public.coin_wallets(user_id,balance) values(recipient,0) on conflict(user_id) do nothing;
 select balance into current_balance from public.coin_wallets where user_id=recipient for update;
 if current_balance+p_amount<0 then raise exception 'Cannot remove more coins than the player has'; end if;
 update public.coin_wallets set balance=current_balance+p_amount,updated_at=now()
 where user_id=recipient returning balance into new_balance;
 insert into public.coin_transactions(user_id,amount,reason)
 values(recipient,p_amount,'owner_adjust:'||left(btrim(p_reason),100));
 return new_balance;
end;
$$;
revoke all on function public.owner_adjust_cartoon_coins(text,bigint,text) from public,anon;
grant execute on function public.owner_adjust_cartoon_coins(text,bigint,text) to authenticated;
