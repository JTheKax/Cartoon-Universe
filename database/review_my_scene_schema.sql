-- REVIEW ONLY. Apply in isolated Supabase test project before production.
create table if not exists public.sticker_catalog (
 id uuid primary key default gen_random_uuid(),
 series text not null check(length(trim(series)) between 1 and 80),
 title text not null check(length(trim(title)) between 1 and 120),
 image_url text not null check(image_url ~ '^https://[^[:space:]]+$'),
 active boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.player_stickers (
 user_id uuid not null references auth.users(id) on delete cascade,
 sticker_id uuid not null references public.sticker_catalog(id),
 quantity integer not null default 1 check(quantity between 1 and 999),
 primary key(user_id,sticker_id)
);
create table if not exists public.player_scenes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null default 'My Scene' check(length(title) between 1 and 80),
 background text not null default 'arcade' check(background in ('arcade','meadow','space')),
 updated_at timestamptz not null default now(),
 unique(id,user_id)
);
create table if not exists public.player_scene_items (
 id uuid primary key default gen_random_uuid(),
 scene_id uuid not null,
 user_id uuid not null default auth.uid(),
 sticker_id uuid not null,
 x numeric(5,2) not null check(x between 0 and 100),
 y numeric(5,2) not null check(y between 0 and 100),
 size numeric(5,2) not null check(size between 8 and 42),
 layer_order smallint not null check(layer_order between 0 and 19),
 foreign key(scene_id,user_id) references public.player_scenes(id,user_id) on delete cascade,
 foreign key(user_id,sticker_id) references public.player_stickers(user_id,sticker_id)
);
create index if not exists player_scenes_user_idx on public.player_scenes(user_id);
create index if not exists player_scene_items_scene_idx on public.player_scene_items(scene_id);
alter table public.sticker_catalog enable row level security;
alter table public.player_stickers enable row level security;
alter table public.player_scenes enable row level security;
alter table public.player_scene_items enable row level security;
revoke all on public.sticker_catalog,public.player_stickers,public.player_scenes,public.player_scene_items from anon,authenticated;
grant select on public.sticker_catalog to authenticated;
grant select on public.player_stickers to authenticated;
grant select,insert,update,delete on public.player_scenes to authenticated;
grant select,insert,update,delete on public.player_scene_items to authenticated;
create policy "active sticker catalog" on public.sticker_catalog for select to authenticated using(active);
create policy "own sticker inventory" on public.player_stickers for select to authenticated using(user_id=(select auth.uid()));
create policy "own scenes read" on public.player_scenes for select to authenticated using(user_id=(select auth.uid()));
create policy "own scenes create" on public.player_scenes for insert to authenticated with check(user_id=(select auth.uid()));
create policy "own scenes update" on public.player_scenes for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "own scenes delete" on public.player_scenes for delete to authenticated using(user_id=(select auth.uid()));
create policy "own scene items read" on public.player_scene_items for select to authenticated using(user_id=(select auth.uid()));
create policy "own scene items create" on public.player_scene_items for insert to authenticated with check(user_id=(select auth.uid()));
create policy "own scene items update" on public.player_scene_items for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "own scene items delete" on public.player_scene_items for delete to authenticated using(user_id=(select auth.uid()));
-- Additional limit: enforce <=20 items per scene using an AFTER/BEFORE trigger
-- or server-side transactional RPC before enabling public rollout.
