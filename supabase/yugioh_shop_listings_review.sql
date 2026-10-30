-- Apply only to a reviewed nonproduction Supabase environment first.
create table if not exists public.yugioh_shop_listings (
 id uuid primary key default gen_random_uuid(),
 source_card_id bigint,
 kind text not null check (kind in ('single','pack')),
 name text not null check (length(name) between 1 and 120),
 category text not null default 'Monster',
 rarity text not null default 'Common',
 card_set text not null default '',
 coins integer not null default 100 check (coins between 0 and 1000000),
 pack_count integer check (pack_count between 1 and 100),
 pack_pool bigint[] not null default '{}',
 description text not null default '',
 artwork_path text,
 status text not null default 'draft' check (status in ('draft','published','unpublished')),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists yugioh_shop_source_card_id_unique on public.yugioh_shop_listings(source_card_id) where source_card_id is not null;
create index if not exists yugioh_shop_status_idx on public.yugioh_shop_listings(status);
alter table public.yugioh_shop_listings enable row level security;
revoke all on public.yugioh_shop_listings from anon, authenticated;
grant select on public.yugioh_shop_listings to anon;
grant select,insert,update,delete on public.yugioh_shop_listings to authenticated;
create policy "Public can see published listings" on public.yugioh_shop_listings for select to anon,authenticated using (
 status='published' or exists(select 1 from public.owner_members m where m.user_id=(select auth.uid()))
);
create policy "Owner creates listings" on public.yugioh_shop_listings for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.owner_members m where m.user_id=(select auth.uid()))
);
create policy "Owner updates listings" on public.yugioh_shop_listings for update to authenticated using (
 exists(select 1 from public.owner_members m where m.user_id=(select auth.uid()))
) with check (
 exists(select 1 from public.owner_members m where m.user_id=(select auth.uid()))
);
create policy "Owner deletes listings" on public.yugioh_shop_listings for delete to authenticated using (
 exists(select 1 from public.owner_members m where m.user_id=(select auth.uid()))
);
