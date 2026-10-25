-- Execute only on disposable CI database.
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$
begin
 if (select count(*) from public.owner_members)<>0 then raise exception 'Nonowner sees membership'; end if;
 if (select count(*) from public.site_maintenance)<>1 then raise exception 'Maintenance not readable'; end if;
 update public.site_maintenance set enabled=true,updated_by='00000000-0000-0000-0000-000000000001';
 if found then raise exception 'Nonowner could update maintenance'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$
begin
 if (select count(*) from public.owner_members)<>1 then raise exception 'Owner membership missing'; end if;
 update public.site_maintenance set enabled=true,updated_by='00000000-0000-0000-0000-000000000002';
 if not found then raise exception 'Owner update failed'; end if;
 if not (select enabled from public.site_maintenance where id=true) then raise exception 'Maintenance not enabled'; end if;
 update public.site_maintenance set enabled=false,updated_by='00000000-0000-0000-0000-000000000002';
 if not found then raise exception 'Owner cannot disable maintenance'; end if;
end $$;
reset role;
rollback;
