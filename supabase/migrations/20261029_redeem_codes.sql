-- Redeem codes foundation. Apply only after reviewing existing coin wallet schema.
create extension if not exists pgcrypto;
create table if not exists public.promo_codes (
 id uuid primary key default gen_random_uuid(),
 code_hash text not null unique,
 reward_type text not null check (reward_type in ('coins','sticker','pack')),
 reward_amount integer not null default 1 check (reward_amount > 0),
 reward_reference text,
 max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
 redemption_count integer not null default 0 check (redemption_count >= 0),
 expires_at timestamptz,
 disabled boolean not null default false,
 created_at timestamptz not null default now(),
 created_by uuid references auth.users(id),
 check (reward_type = 'coins' or reward_reference is not null)
);
create table if not exists public.promo_redemptions (
 id uuid primary key default gen_random_uuid(),
 promo_id uuid not null references public.promo_codes(id),
 user_id uuid not null references auth.users(id),
 redeemed_at timestamptz not null default now(),
 unique (promo_id,user_id)
);
create index if not exists promo_redemptions_user_idx on public.promo_redemptions(user_id);
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
revoke all on public.promo_codes from anon, authenticated;
revoke all on public.promo_redemptions from anon, authenticated;
-- No reward-granting RPC is installed until the existing wallet/sticker grant
-- functions and owner authorization have been inspected. Do not grant coins
-- by direct client updates or accept reward amounts from the browser.
