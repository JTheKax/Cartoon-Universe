-- REVIEW ONLY. Apply to Supabase only after owner_members RLS and grants are verified.
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
create policy "theater programs public read" on public.theater_programs for select to anon,authenticated using (true);
create policy "theater live public read" on public.theater_live for select to anon,authenticated using (true);
-- SECURITY DEFINER owner check avoids recursive owner_members RLS evaluation.
-- Search_path locked and EXECUTE limited to authenticated.
create or replace function public.theater_is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.owner_members where user_id=(select auth.uid()));
$$;
revoke all on function public.theater_is_owner() from public,anon;
grant execute on function public.theater_is_owner() to authenticated;
create policy "theater owner insert programs" on public.theater_programs for insert to authenticated with check (public.theater_is_owner());
create policy "theater owner update programs" on public.theater_programs for update to authenticated using (public.theater_is_owner()) with check (public.theater_is_owner());
create policy "theater owner delete programs" on public.theater_programs for delete to authenticated using (public.theater_is_owner());
create policy "theater owner insert live" on public.theater_live for insert to authenticated with check (public.theater_is_owner());
create policy "theater owner update live" on public.theater_live for update to authenticated using (public.theater_is_owner()) with check (public.theater_is_owner());
