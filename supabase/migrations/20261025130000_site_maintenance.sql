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

-- Audit every maintenance setting change without exposing the audit log to clients.
create table if not exists public.site_maintenance_audit (
 id bigint generated always as identity primary key,
 changed_at timestamptz not null default now(),
 actor_id uuid,
 old_enabled boolean not null,
 new_enabled boolean not null,
 old_message text not null,
 new_message text not null
);
alter table public.site_maintenance_audit enable row level security;
revoke all on public.site_maintenance_audit from anon,authenticated;
create or replace function public.record_site_maintenance_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  insert into public.site_maintenance_audit(actor_id,old_enabled,new_enabled,old_message,new_message)
  values(auth.uid(),old.enabled,new.enabled,old.message,new.message);
  return new;
end;
$$;
revoke all on function public.record_site_maintenance_change() from public,anon,authenticated;
create trigger audit_site_maintenance_changes
before update on public.site_maintenance
for each row execute function public.record_site_maintenance_change();

-- Prevent maintenance activation until all write paths are protected.
-- Message edits are allowed; enabling maintenance is deliberately rejected.
create or replace function public.prevent_unprotected_maintenance_activation()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if new.enabled is true then
  raise exception 'Maintenance activation is locked until all player write paths are protected';
 end if;
 return new;
end;
$$;
revoke all on function public.prevent_unprotected_maintenance_activation() from public,anon,authenticated;
create trigger prevent_unprotected_maintenance_activation
before update on public.site_maintenance
for each row execute function public.prevent_unprotected_maintenance_activation();

-- Restrict daily rewards at the database boundary. This is only one write path;
-- activation remains locked until ALL mutations have been audited.
create or replace function public.maintenance_guard_daily_claim()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
 if exists (select 1 from public.site_maintenance where id=true and enabled=true)
    and not exists(select 1 from public.owner_members where user_id=auth.uid()) then
   raise exception 'Cartoon Universe is under maintenance. Try again later'
     using errcode='55000';
 end if;
 return new;
end;
$$;
revoke all on function public.maintenance_guard_daily_claim() from public,anon,authenticated;
create trigger maintenance_guard_daily_claim
before insert on public.coin_daily_claims
for each row execute function public.maintenance_guard_daily_claim();
