-- REVIEW ONLY. Do not execute against production without an approved migration review.
-- Production already has theater_programs/theater_live and theater_private.is_owner().
-- This reference is idempotent for a disposable database and uses a non-exposed
-- private owner-check function, matching the observed production design.
create table if not exists public.theater_programs (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 100),
 media_url text not null check(media_url ~ '^https://[^[:space:]]+$'),
 duration_minutes integer not null check(duration_minutes between 1 and 1440),
 sort_order integer not null default 0,
 enabled boolean not null default true
);
create table if not exists public.theater_live (
 id integer primary key check(id=1),
 title text not null check(length(trim(title)) between 1 and 100),
 media_url text not null check(media_url ~ '^https://[^[:space:]]+$'),
 enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.theater_programs enable row level security;
alter table public.theater_live enable row level security;
revoke all on public.theater_programs,public.theater_live from public,anon,authenticated;
grant select on public.theater_programs,public.theater_live to anon,authenticated;
grant insert,update,delete on public.theater_programs to authenticated;
grant insert,update on public.theater_live to authenticated;

-- Keep SECURITY DEFINER outside public/other exposed API schemas.
create schema if not exists theater_private;
revoke all on schema theater_private from public,anon;
grant usage on schema theater_private to authenticated;
create or replace function theater_private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null
   and exists(select 1 from public.owner_members where user_id=(select auth.uid()));
$$;
revoke all on function theater_private.is_owner() from public,anon;
grant execute on function theater_private.is_owner() to authenticated;

-- PostgreSQL does not support CREATE POLICY IF NOT EXISTS; preserve existing
-- policies by name and create only missing policies in disposable installs.
do $policies$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='theater_programs' and policyname='theater programs public read') then
  create policy "theater programs public read" on public.theater_programs for select to anon,authenticated using (true);
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='theater_live' and policyname='theater live public read') then
  create policy "theater live public read" on public.theater_live for select to anon,authenticated using (true);
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='theater_programs' and policyname='theater owner insert programs') then
  create policy "theater owner insert programs" on public.theater_programs for insert to authenticated with check ((select theater_private.is_owner()));
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='theater_programs' and policyname='theater owner update programs') then
  create policy "theater owner update programs" on public.theater_programs for update to authenticated using ((select theater_private.is_owner())) with check ((select theater_private.is_owner()));
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='theater_programs' and policyname='theater owner delete programs') then
  create policy "theater owner delete programs" on public.theater_programs for delete to authenticated using ((select theater_private.is_owner()));
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='theater_live' and policyname='theater owner insert live') then
  create policy "theater owner insert live" on public.theater_live for insert to authenticated with check ((select theater_private.is_owner()));
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='theater_live' and policyname='theater owner update live') then
  create policy "theater owner update live" on public.theater_live for update to authenticated using ((select theater_private.is_owner())) with check ((select theater_private.is_owner()));
 end if;
end
$policies$;
