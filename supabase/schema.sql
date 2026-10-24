-- Run once in a NEW Supabase project SQL editor.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
 display_name text not null default '',
 avatar_color text not null default '#ff4ca8' check (avatar_color in ('#ff4ca8','#54f4ff','#ffe15c','#a78bfa')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.owner_members (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.profiles enable row level security;
alter table public.owner_members enable row level security;
create policy "public profiles readable" on public.profiles for select using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "owner membership self read" on public.owner_members for select to authenticated using ((select auth.uid()) = user_id);
-- No client insert/update/delete policies on owner_members.
-- Grant owner status ONLY via SQL editor after first signup, replacing UUID:
-- insert into public.owner_members(user_id) values ('YOUR_AUTH_USER_UUID') on conflict do nothing;
-- Never expose a service_role key in the browser.
