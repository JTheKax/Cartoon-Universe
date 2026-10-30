-- REVIEW ONLY. Do not run against production until reviewed and tested in isolation.
-- Each sticker is a distinct catalog item; series and category are not ownership records.
create table if not exists public.ctoon_stickers (
  id uuid primary key default gen_random_uuid(),
  series_key text not null,
  sticker_key text not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique(series_key, sticker_key)
);
create table if not exists public.ctoon_ownership (
  user_id uuid not null references auth.users(id) on delete cascade,
  sticker_id uuid not null references public.ctoon_stickers(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key(user_id, sticker_id)
);
alter table public.ctoon_stickers enable row level security;
alter table public.ctoon_ownership enable row level security;
-- Public catalog is readable. Catalog writes must use an audited owner-only path.
create policy "read ctoon catalog" on public.ctoon_stickers
 for select to anon, authenticated using (true);
-- Users can see their own collection, but must not self-award stickers.
create policy "read own ctoon ownership" on public.ctoon_ownership
 for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.ctoon_stickers from anon, authenticated;
grant select on public.ctoon_stickers to anon, authenticated;
revoke all on public.ctoon_ownership from anon, authenticated;
grant select on public.ctoon_ownership to authenticated;
-- No client insert/update/delete policies or grants: awarding, trading, and
-- recycling must be implemented via separately audited server-side transactions.
-- Verify before rollout: cross-user reads blocked, client grants blocked,
-- catalog readable, owner-award paths checked, no exposed privileged functions.
