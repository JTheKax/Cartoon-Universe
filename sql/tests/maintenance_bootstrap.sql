-- Disposable test database only.
create table public.owner_members(user_id uuid primary key references auth.users(id));
create table public.profiles(
 id uuid primary key references auth.users(id),
 username text not null,
 display_name text not null,
 avatar_color text not null default '#123456',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 presence_mode text not null default 'offline'
);
insert into public.owner_members(user_id) values('00000000-0000-0000-0000-000000000002');
insert into public.profiles(id,username,display_name) values
('00000000-0000-0000-0000-000000000001','player','Player'),
('00000000-0000-0000-0000-000000000002','owner','Owner');
grant select on public.owner_members to authenticated;
grant select on public.profiles to authenticated;
grant update(username,display_name,presence_mode) on public.profiles to authenticated;
alter table public.owner_members enable row level security;
alter table public.profiles enable row level security;
create policy owner_self on public.owner_members for select to authenticated using(user_id=auth.uid());
create policy profile_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
