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
reset role;
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
do $$
begin
 begin
  update public.site_maintenance set enabled=true where id=true;
  raise exception 'Maintenance activation unexpectedly succeeded';
 exception when sqlstate '55000' then null;
 end;
end $$;
rollback;
