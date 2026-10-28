-- REVIEW ONLY. Do not apply to production until security review and isolated tests pass.
-- Owner grants are atomic and recorded in the existing coin ledger.
create or replace function public.owner_grant_cartoon_coins(
  p_username text, p_amount bigint, p_reason text
) returns bigint
language plpgsql security definer
set search_path = ''
as $$
declare v_recipient uuid; v_balance bigint;
begin
  if auth.uid() is null or not exists (
    select 1 from public.owner_members where user_id = auth.uid()
  ) then raise exception 'Owner access required' using errcode = '42501'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000000 then
    raise exception 'Invalid coin amount'; end if;
  if p_reason is null or length(btrim(p_reason)) < 3 or length(p_reason) > 120 then
    raise exception 'Reason must be 3 to 120 characters'; end if;
  select id into strict v_recipient from public.profiles
   where lower(username) = lower(btrim(p_username));
  insert into public.coin_wallets(user_id,balance)
    values(v_recipient,0) on conflict(user_id) do nothing;
  update public.coin_wallets set balance = balance + p_amount,
    updated_at = now() where user_id = v_recipient returning balance into v_balance;
  insert into public.coin_transactions(user_id,amount,reason)
    values(v_recipient,p_amount,'owner_grant:' || left(btrim(p_reason),100));
  return v_balance;
end;
$$;
revoke all on function public.owner_grant_cartoon_coins(text,bigint,text) from public, anon;
grant execute on function public.owner_grant_cartoon_coins(text,bigint,text) to authenticated;
-- Security verification: authenticated non-owners must receive 42501.
-- Check role grants, search_path, ledger triggers, and advisor warnings before enabling UI.
