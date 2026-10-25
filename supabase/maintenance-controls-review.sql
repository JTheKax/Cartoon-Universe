-- REVIEW ONLY: run in disposable CI/staging; do not apply to production yet.
-- Review notes only. Existing production RLS policies verified on 2026-10-25.
-- site_maintenance already has maintenance_read (anon/authenticated SELECT)
-- and maintenance_owner_update (authenticated UPDATE restricted to owner_members).
-- The UPDATE WITH CHECK requires updated_by = auth.uid().
-- Do NOT create duplicate policies. UI must include updated_by on updates.
-- Maintenance activation stays disabled until server-side operations enforce the flag.
-- Static hosting cannot hide publicly published assets or HTML securely.

-- Profile writes are a real deployed mutation path (auth.js insert/upsert).
-- Restrictive policies AND with existing own-profile policies; owner bypass
-- permits maintenance access without granting access to another player's profile.
-- Missing maintenance state denies nonowner writes. No SELECT policy is changed.
begin;
drop policy if exists maintenance_profile_insert on public.profiles;
create policy maintenance_profile_insert on public.profiles
as restrictive for insert to authenticated
with check (
  coalesce((select not enabled from public.site_maintenance where id=true), false)
  or exists(select 1 from public.owner_members where user_id=(select auth.uid()))
);
drop policy if exists maintenance_profile_update on public.profiles;
create policy maintenance_profile_update on public.profiles
as restrictive for update to authenticated
using (
  coalesce((select not enabled from public.site_maintenance where id=true), false)
  or exists(select 1 from public.owner_members where user_id=(select auth.uid()))
)
with check (
  coalesce((select not enabled from public.site_maintenance where id=true), false)
  or exists(select 1 from public.owner_members where user_id=(select auth.uid()))
);
commit;
