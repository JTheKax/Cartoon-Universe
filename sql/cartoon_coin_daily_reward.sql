-- Cartoon Coins foundation. Review and apply to Supabase only after PR validation.
-- Preserves existing balances and historical transactions.
-- One claim per UTC day, with atomic credit and transaction log.
create unique index if not exists coin_daily_reward_once_per_utc_day
on public.coin_transactions (user_id, ((created_at at time zone 'UTC')::date))
where reason = 'daily_reward';

create or replace function public.claim_daily_cartoon_coins()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := auth.uid();
  current_balance bigint;
  claimed_id bigint;
begin
  if player_id is null or auth.jwt() ->> 'is_anonymous' = 'true' then
    raise exception 'Sign in to claim daily Cartoon Coins';
  end if;

  -- Serialize claims per player even if the wallet has not yet been created.
  perform pg_advisory_xact_lock(hashtextextended(player_id::text, 0));
  insert into public.coin_wallets (user_id, balance)
  values (player_id, 0)
  on conflict (user_id) do nothing;

  insert into public.coin_transactions (user_id, amount, reason)
  values (player_id, 25, 'daily_reward')
  on conflict do nothing
  returning id into claimed_id;

  if claimed_id is not null then
    update public.coin_wallets
    set balance = balance + 25, updated_at = now()
    where user_id = player_id
    returning balance into current_balance;
  else
    select balance into current_balance from public.coin_wallets where user_id = player_id;
  end if;

  return jsonb_build_object(
    'claimed', claimed_id is not null,
    'awarded', case when claimed_id is not null then 25 else 0 end,
    'balance', current_balance,
    'next_claim_utc', ((now() at time zone 'UTC')::date + 1)::text || 'T00:00:00Z'
  );
end;
$$;

revoke all on function public.claim_daily_cartoon_coins() from public, anon;
grant execute on function public.claim_daily_cartoon_coins() to authenticated;
