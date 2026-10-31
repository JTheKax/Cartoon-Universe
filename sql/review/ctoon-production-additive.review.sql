-- Review-only, additive Ctoon production schema. Apply only with a reviewed release.
-- No seeded or synthetic ownership. Existing auth users and coin tables remain unchanged.
create table if not exists public.ctoon_sticker_catalog (
 id uuid primary key default gen_random_uuid(),
 series text not null check (length(trim(series)) between 1 and 120),
 subseries text,
 sticker_code text not null unique check (length(trim(sticker_code)) between 1 and 100),
 title text not null check (length(trim(title)) between 1 and 160),
 artwork_url text,
 published boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.ctoon_sticker_ownership (
 user_id uuid not null references auth.users(id) on delete cascade,
 sticker_id uuid not null references public.ctoon_sticker_catalog(id) on delete cascade,
 quantity integer not null default 1 check (quantity > 0),
 acquired_at timestamptz not null default now(),
 acquisition_source text not null default 'system',
 primary key(user_id,sticker_id)
);
alter table public.ctoon_sticker_ownership add column if not exists quantity integer not null default 1;
create index if not exists ctoon_sticker_catalog_series_idx on public.ctoon_sticker_catalog(series,subseries);
create index if not exists ctoon_sticker_ownership_user_idx on public.ctoon_sticker_ownership(user_id);
alter table public.ctoon_sticker_catalog enable row level security;
alter table public.ctoon_sticker_ownership enable row level security;
revoke all on public.ctoon_sticker_catalog from anon,authenticated;
revoke all on public.ctoon_sticker_ownership from anon,authenticated;
grant select on public.ctoon_sticker_catalog to anon,authenticated;
grant select on public.ctoon_sticker_ownership to authenticated;
drop policy if exists ctoon_catalog_public_read on public.ctoon_sticker_catalog;
create policy ctoon_catalog_public_read on public.ctoon_sticker_catalog for select to anon,authenticated using(published=true);
drop policy if exists ctoon_ownership_self_read on public.ctoon_sticker_ownership;
create policy ctoon_ownership_self_read on public.ctoon_sticker_ownership for select to authenticated using((select auth.uid())=user_id);
-- Purchase/grant/trade must use a separate trusted, audited atomic server-side flow.
