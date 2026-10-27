-- REVIEW ONLY. Apply only to disposable CI/staging after security review.
-- This migration does not change the global maintenance switch or production.
begin;

create table if not exists public.section_maintenance (
 section_key text primary key check (section_key in (
  'home','explore','sticker-shop','card-battle','games','retro-arcade',
  'player-shops','radio','movie-theater','community')),
 maintenance_enabled boolean not null default true,
 updated_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
create table if not exists public.section_maintenance_audit (
 id bigint generated always as identity primary key,
 section_key text not null references public.section_maintenance(section_key),
 previous_enabled boolean not null,
 maintenance_enabled boolean not null,
 owner_id uuid not null references auth.users(id),
 changed_at timestamptz not null default now()
);

-- Fresh installations start closed; existing rows are never reset on re-run.
insert into public.section_maintenance(section_key)
select key from unnest(array[
 'home','explore','sticker-shop','card-battle','games','retro-arcade',
 'player-shops','radio','movie-theater','community']) as key
on conflict(section_key) do nothing;

alter table public.section_maintenance enable row level security;
alter table public.section_maintenance_audit enable row level security;
drop policy if exists section_status_public_read on public.section_maintenance;
create policy section_status_public_read on public.section_maintenance
 for select to anon, authenticated using (true);
-- Never grant client writes, even to an owner: the RPC must audit atomically.
revoke all on public.section_maintenance, public.section_maintenance_audit
 from public, anon, authenticated;
grant select on public.section_maintenance to anon, authenticated;

create or replace function public.set_section_maintenance(
 p_section text, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 prior_enabled boolean;
begin
 if actor is null or auth.role() is distinct from 'authenticated'
    or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    or not exists (select 1 from public.owner_members where user_id=actor) then
  raise exception 'Verified owner required' using errcode='28000';
 end if;
 if p_section is null or p_enabled is null then
  raise exception 'Section and boolean state required' using errcode='22023';
 end if;
 select maintenance_enabled into prior_enabled
 from public.section_maintenance where section_key=p_section for update;
 if not found then
  raise exception 'Unknown section' using errcode='22023';
 end if;
 update public.section_maintenance
  set maintenance_enabled=p_enabled,updated_by=actor,updated_at=now()
  where section_key=p_section;
 insert into public.section_maintenance_audit
  (section_key,previous_enabled,maintenance_enabled,owner_id)
  values(p_section,prior_enabled,p_enabled,actor);
 return jsonb_build_object('saved',true,'audited',true,'section',p_section,
  'maintenanceEnabled',p_enabled);
end;
$$;
revoke all on function public.set_section_maintenance(text,boolean)
 from public, anon, authenticated;
grant execute on function public.set_section_maintenance(text,boolean)
 to authenticated;
commit;
