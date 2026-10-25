-- Cartoon Universe maintenance controls (review before applying)
-- Run only after validating existing policies and backup. No automatic production migration.
-- Site maintenance is advisory on a static host: protected RPCs must separately enforce it.
create policy "maintenance visible to visitors" on public.site_maintenance
for select to anon, authenticated using (id = true);
create policy "maintenance owner update" on public.site_maintenance
for update to authenticated
using (id = true and exists (select 1 from public.owner_members om where om.user_id = (select auth.uid())))
with check (id = true and exists (select 1 from public.owner_members om where om.user_id = (select auth.uid())));
-- NOTE: Verify owner_members SELECT policy and GRANT permissions before applying.
-- Do not enable site maintenance until server-side write operations enforce the flag.
