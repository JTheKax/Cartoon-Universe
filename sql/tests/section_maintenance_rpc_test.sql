-- Disposable PostgreSQL fixture only. All changes are rolled back.
\set ON_ERROR_STOP on
begin;
do $$
begin
 if (select count(*) from public.section_maintenance)<>10 then
  raise exception 'Expected ten default-closed sections';
 end if;
 if exists(select 1 from public.section_maintenance where maintenance_enabled is distinct from true) then
  raise exception 'Section default must be maintenance ON';
 end if;
 if has_table_privilege('authenticated','public.section_maintenance','UPDATE')
    or has_table_privilege('authenticated','public.section_maintenance_audit','INSERT')
    or has_table_privilege('anon','public.section_maintenance','UPDATE')
    or has_table_privilege('authenticated','public.section_maintenance_audit','SELECT') then
  raise exception 'Direct section or audit access is too broad';
 end if;
 if not has_function_privilege('anon','public.get_maintenance_snapshot()','EXECUTE')
    or not has_function_privilege('authenticated','public.get_maintenance_snapshot()','EXECUTE')
    or exists (select 1 from pg_proc where oid='public.get_maintenance_snapshot()'::regprocedure
      and (prosecdef or provolatile<>'s')) then
  raise exception 'Snapshot RPC must be stable, invoker and publicly readable';
 end if;
 if has_function_privilege('anon','public.set_section_maintenance(text,boolean)','EXECUTE')
    or not has_function_privilege('authenticated','public.set_section_maintenance(text,boolean)','EXECUTE') then
  raise exception 'RPC execute grants are incorrect';
 end if;
end $$;

set local role anon;
do $$
begin
 if (select count(*) from public.section_maintenance)<>10 then
  raise exception 'Public section status must be readable';
 end if;
 if (public.get_maintenance_snapshot()->>'globalMaintenance')<>'false'
    or jsonb_array_length(public.get_maintenance_snapshot()->'sectionRows')<>10 then
  raise exception 'Anonymous consistent snapshot did not include global and ten sections';
 end if;
 begin
  perform public.set_section_maintenance('radio',false);
  raise exception 'Anonymous caller changed section';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $$
begin
 begin
  perform public.set_section_maintenance('radio',false);
  raise exception 'Nonowner changed section';
 exception when sqlstate '28000' then null;
 end;
 begin
  update public.section_maintenance set maintenance_enabled=false where section_key='radio';
  raise exception 'Direct authenticated update unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$
declare result jsonb;
begin
 result:=public.set_section_maintenance('radio',false);
 if result->>'saved' <> 'true' or result->>'audited'<>'true' then
  raise exception 'Owner RPC did not confirm write and audit';
 end if;
 begin
  perform public.set_section_maintenance('unknown',false);
  raise exception 'Unknown section accepted';
 exception when invalid_parameter_value then null;
 end;
 begin
  perform public.set_section_maintenance('radio',null);
  raise exception 'Null section status accepted';
 exception when invalid_parameter_value then null;
 end;
end $$;
reset role;
do $$
begin
 if (select maintenance_enabled from public.section_maintenance where section_key='radio') is distinct from false then
  raise exception 'Owner update did not persist';
 end if;
 if not exists (select 1 from jsonb_array_elements(public.get_maintenance_snapshot()->'sectionRows') as entry
   where entry->>'section_key'='radio' and entry->>'maintenance_enabled'='false') then
  raise exception 'Snapshot did not reflect the audited owner change';
 end if;
 if (select count(*) from public.section_maintenance_audit where section_key='radio'
     and previous_enabled=true and maintenance_enabled=false
     and owner_id='00000000-0000-0000-0000-000000000002')<>1 then
  raise exception 'Owner update audit missing';
 end if;
end $$;

-- Force the audit insert to fail and prove the preceding status update rolls back.
create function public.section_audit_fail_fixture() returns trigger language plpgsql as $$
begin
 raise exception 'Forced audit failure' using errcode='23514';
end;
$$;
create trigger section_audit_fail_fixture before insert on public.section_maintenance_audit
for each row execute function public.section_audit_fail_fixture();
set local role authenticated;
do $$
begin
 begin
  perform public.set_section_maintenance('radio',true);
  raise exception 'Audit failure did not abort the RPC';
 exception when check_violation then null;
 end;
end $$;
reset role;
do $$
begin
 if (select maintenance_enabled from public.section_maintenance where section_key='radio') is distinct from false then
  raise exception 'Audit failure did not roll back section state';
 end if;
 if (select count(*) from public.section_maintenance_audit where section_key='radio')<>1 then
  raise exception 'Audit failure created an inconsistent audit history';
 end if;
end $$;
rollback;
