-- Disposable CI database only. Do not run against production.
-- profiles and owner_members are created from the real initial schema first.
create table public.site_maintenance(
 id boolean primary key default true check(id=true),
 enabled boolean not null default false,
 message text not null default 'Maintenance',
 updated_by uuid references auth.users(id)
);
insert into public.owner_members(user_id) values ('00000000-0000-0000-0000-000000000002');
insert into public.site_maintenance(id,enabled,message) values(true,false,'Maintenance');
alter table public.owner_members enable row level security;
alter table public.site_maintenance enable row level security;
create policy maintenance_read on public.site_maintenance
 for select to anon,authenticated using(true);
create policy maintenance_owner_update on public.site_maintenance
 for update to authenticated
 using(exists(select 1 from public.owner_members where user_id=(select auth.uid())))
 with check(exists(select 1 from public.owner_members where user_id=(select auth.uid()))
   and updated_by=(select auth.uid()));
grant select on public.owner_members to authenticated;
grant select on public.site_maintenance to anon,authenticated;
grant update on public.site_maintenance to authenticated;

-- Match browser profile operations without granting deletion or owner writes.
grant select on public.profiles to anon,authenticated;
grant insert,update on public.profiles to authenticated;
