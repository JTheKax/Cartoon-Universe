-- Cartoon Coin daily reward migration (reviewed; NOT applied to production).
-- Additive schema: existing balances, transactions, accounts and game progress remain intact.
-- The reward date is an explicit UTC date, not an expression index on timestamptz.
begin;

create table if not exists public.coin_daily_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_date date not null,
  transaction_id bigint unique references public.coin_transactions(id),
  claimed_at timestamptz not null default now(),
  primary key (user_id, reward_date)
);

alter table public.coin_daily_claims enable row level security;

-- Claims are visible only to their owner; no client INSERT/UPDATE/DELETE policies.
drop policy if exists "Players view own daily coin claims" on public.coin_daily_claims;
create policy "Players view own daily coin claims"
  on public.coin_daily_claims for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.coin_daily_claims from public, anon, authenticated;
grant select on public.coin_daily_claims to authenticated;

-- Atomic server-controlled award. SECURITY DEFINER is necessary because clients
-- cannot directly write coin_wallets, coin_transactions or coin_daily_claims.
-- The function has no player ID or amount parameters; identity comes from auth.uid().
-- Create and revoke EXECUTE within one transaction to avoid a public exposure window.
create or replace function public.claim_daily_cartoon_coins()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  player_id uuid := auth.uid();
  today_utc date := (now() at time zone 'UTC')::date;
  current_balance bigint;
  new_claim boolean := false;
  claim_tx bigint;
begin
  if player_id is null
     or auth.role() is distinct from 'authenticated'
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in to claim daily Cartoon Coins'
      using errcode = '28000';
  end if;

  -- The wallet row is the per-user lock; all concurrent calls serialize here.
  insert into public.coin_wallets (user_id, balance)
  values (player_id, 0)
  on conflict (user_id) do nothing;

  select balance into current_balance
  from public.coin_wallets where user_id = player_id for update;

  -- Existing reward history is honored when upgrading an existing installation.
  -- The first version had no daily rewards, but this guard also covers re-runs.
  if exists (
    select 1 from public.coin_transactions
    where user_id = player_id and reason = 'daily_reward'
      and created_at >= (today_utc::timestamp at time zone 'UTC')
      and created_at < ((today_utc + 1)::timestamp at time zone 'UTC')
  ) then
    return jsonb_build_object('claimed',false,'awarded',0,'balance',current_balance,
      'next_claim_utc',((today_utc + 1)::text || 'T00:00:00Z'));
  end if;

  -- Only a conflict on the explicit daily-claim key is considered a duplicate.
  insert into public.coin_daily_claims (user_id, reward_date)
  values (player_id, today_utc)
  on conflict (user_id, reward_date) do nothing;

  get diagnostics new_claim = row_count;
  if new_claim then
    update public.coin_wallets
       set balance = balance + 25, updated_at = now()
     where user_id = player_id
     returning balance into current_balance;

    insert into public.coin_transactions (user_id, amount, reason)
    values (player_id, 25, 'daily_reward')
    returning id into claim_tx;

    update public.coin_daily_claims
       set transaction_id = claim_tx
     where user_id = player_id and reward_date = today_utc;
  end if;

  return jsonb_build_object(
    'claimed',new_claim,
    'awarded',case when new_claim then 25 else 0 end,
    'balance',current_balance,
    'next_claim_utc',((today_utc + 1)::text || 'T00:00:00Z')
  );
end;
$$;

revoke all on function public.claim_daily_cartoon_coins() from public, anon, authenticated;
grant execute on function public.claim_daily_cartoon_coins() to authenticated;

commit;
