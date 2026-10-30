-- Review and apply ONLY in an isolated nonproduction Supabase project.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('yugioh-shop-artwork','yugioh-shop-artwork',true,3145728,array['image/png','image/jpeg'])
on conflict (id) do nothing;
create policy "Published card artwork public read" on storage.objects for select to anon,authenticated
using (bucket_id='yugioh-shop-artwork');
create policy "Owner uploads card artwork" on storage.objects for insert to authenticated
with check (bucket_id='yugioh-shop-artwork' and exists(select 1 from public.owner_members m where m.user_id=(select auth.uid())));
create policy "Owner updates card artwork" on storage.objects for update to authenticated
using (bucket_id='yugioh-shop-artwork' and exists(select 1 from public.owner_members m where m.user_id=(select auth.uid())))
with check (bucket_id='yugioh-shop-artwork' and exists(select 1 from public.owner_members m where m.user_id=(select auth.uid())));
create policy "Owner removes card artwork" on storage.objects for delete to authenticated
using (bucket_id='yugioh-shop-artwork' and exists(select 1 from public.owner_members m where m.user_id=(select auth.uid())));
