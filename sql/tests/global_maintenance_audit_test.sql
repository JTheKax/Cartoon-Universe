-- Disposable CI only: owner-only atomic global state + audit, rollback and denied direct writes.
\set ON_ERROR_STOP on
begin;
do $$
begin
 if has_table_privilege('authenticated','public.site_maintenance','UPDATE')
    or has_table_privilege('authenticated','public.global_maintenance_audit','INSERT')
    or has_table_privilege('authenticated','public.global_maintenance_audit','SELECT')
    or has_function_privilege('anon','public.set_global_maintenance(boolean,text)','EXECUTE')
    or not has_function_privilege('authenticated','public.set_global_maintenance(boolean,text)','EXECUTE') then
  raise exception 'Unsafe global maintenance grants';
 end if;
 if not exists(select 1 from pg_proc where oid='public.set_global_maintenance(boolean,text)'::regprocedure
    and prosecdef and coalesce(array_to_string(proconfig,','),'') like '%search_path=%') then
  raise exception 'Global RPC must use a restricted security-definer search path';
 end if;
end $$;
set local role anon;
do $$
begin
 begin
  perform public.set_global_maintenance(true,null);
  raise exception 'Anonymous caller changed global maintenance';
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
  perform public.set_global_maintenance(true,null);
  raise exception 'Nonowner changed global maintenance';
 exception when sqlstate '28000' then null;
 end;
 begin
  update public.site_maintenance set enabled=true where id=true;
  raise exception 'Direct maintenance update unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$
declare result jsonb;
begin
 result:=public.set_global_maintenance(true,'Owner maintenance test');
 if result->>'saved'<>'true' or result->>'audited'<>'true'
    or result->>'globalMaintenance'<>'true' then
  raise exception 'Owner global RPC did not acknowledge audited write';
 end if;
 begin
  perform public.set_global_maintenance(null,null);
  raise exception 'Null global status accepted';
 exception when invalid_parameter_value then null;
 end;
 begin
  perform public.set_global_maintenance(false,'');
  raise exception 'Empty message accepted';
 exception when invalid_parameter_value then null;
 end;
end $$;
reset role;
do $$
begin
 if (select enabled from public.site_maintenance where id=true) is distinct from true
    or (select message from public.site_maintenance where id=true)<>'Owner maintenance test'
    or (select count(*) from public.global_maintenance_audit
      where previous_enabled=false and maintenance_enabled=true
        and previous_message='Maintenance' and message='Owner maintenance test'
        and owner_id='00000000-0000-0000-0000-000000000002')<>1 then
  raise exception 'Global maintenance status or audit mismatch';
 end if;
end $$;
create function public.global_audit_fail_fixture() returns trigger language plpgsql as $$
begin raise exception 'Forced global audit failure' using errcode='23514'; end;
$$;
create trigger global_audit_fail_fixture before insert on public.global_maintenance_audit
for each row execute function public.global_audit_fail_fixture();
set local role authenticated;
do $$
begin
 begin
  perform public.set_global_maintenance(false,null);
  raise exception 'Global audit failure did not abort the RPC';
 exception when check_violation then null;
 end;
end $$;
reset role;
do $$
begin
 if (select enabled from public.site_maintenance where id=true) is distinct from true
    or (select count(*) from public.global_maintenance_audit)<>1 then
  raise exception 'Global audit failure did not roll back the maintenance state';
 end if;
end $$;
rollback;
