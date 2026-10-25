\set ON_ERROR_STOP on
begin;
do $$
begin
 if (select enabled from public.site_maintenance where id=true) is distinct from false then
  raise exception 'Maintenance must default OFF';
 end if;
 if has_table_privilege('anon','public.site_maintenance','UPDATE') then
  raise exception 'Anonymous maintenance updates permitted';
 end if;
 if has_table_privilege('anon','public.site_maintenance_audit','SELECT') or has_table_privilege('authenticated','public.site_maintenance_audit','SELECT') then
  raise exception 'Audit log is readable by clients';
 end if;
 if has_table_privilege('authenticated','public.site_maintenance','INSERT') then
  raise exception 'Authenticated maintenance insert permitted';
 end if;
end $$;
-- Simulate a player and verify they cannot change maintenance settings.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$
begin
 update public.site_maintenance set message='unauthorized' where id=true;
 if found then raise exception 'Non-owner modified maintenance settings'; end if;
end $$;
-- Maintenance is OFF: a player must still be able to edit their own profile.
update public.profiles set display_name='Player updated while online'
 where id='00000000-0000-0000-0000-000000000001';
reset role;
do $$
begin
 if (select display_name from public.profiles where id='00000000-0000-0000-0000-000000000001')<>'Player updated while online' then
  raise exception 'Profile writes unexpectedly blocked while maintenance OFF';
 end if;
end $$;
-- Owner can edit message but activation is blocked at the database boundary.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
update public.site_maintenance set message='Scheduled system upgrades' where id=true;
reset role;
do $$
begin
 if (select message from public.site_maintenance where id=true)<>'Scheduled system upgrades' then
  raise exception 'Owner maintenance edit failed';
 end if;
 if (select count(*) from public.site_maintenance_audit)<>1 then
  raise exception 'Maintenance audit entry missing';
 end if;
end $$;
-- Activation must fail even for the owner, not only for anonymous players.
do $
begin
 begin
  update public.site_maintenance set enabled=true where id=true;
  raise exception 'Maintenance activation unexpectedly succeeded';
 exception when sqlstate '55000' then null;
 end;
end $$;
do $
begin
 if (select enabled from public.site_maintenance where id=true) then
  raise exception 'Maintenance was enabled despite activation lock';
 end if;
 if (select count(*) from public.site_maintenance_audit)<>1 then
  raise exception 'Rejected activation must not produce an audit record';
 end if;
end $;
rollback;
