-- Owner-controlled maintenance state; defaults OFF, preserving live access.
create table if not exists public.site_maintenance (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  message text not null default '🎃 The haunted arcade is getting a tune-up! We’ll be back soon.',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint maintenance_message_length check (char_length(message) between 1 and 280)
);
insert into public.site_maintenance(id,enabled) values (true,false) on conflict (id) do nothing;
alter table public.site_maintenance enable row level security;
revoke all on public.site_maintenance from anon,authenticated;
grant select on public.site_maintenance to anon,authenticated;
grant update (enabled,message) on public.site_maintenance to authenticated;
create policy "Anyone can read maintenance state" on public.site_maintenance for select to anon,authenticated using (true);
create policy "Only owners can update maintenance" on public.site_maintenance for update to authenticated
 using (exists(select 1 from public.owner_members where user_id=(select auth.uid())))
 with check (id=true and exists(select 1 from public.owner_members where user_id=(select auth.uid())));
