-- Disposable CI only. Tests the actual proposed restrictive policies.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000003');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
set local role authenticated;
-- OFF: both creation and the browser's upsert path work normally.
insert into public.profiles(id,username) values(auth.uid(),'test_player');
insert into public.profiles(id,username,display_name)
values(auth.uid(),'test_player','Normal editing')
on conflict(id) do update set display_name=excluded.display_name;
do $$
begin
 if (select display_name from public.profiles where id=auth.uid()) is distinct from 'Normal editing' then
  raise exception 'Maintenance OFF blocked profile upsert';
 end if;
end $$;
reset role;
update public.site_maintenance set enabled=true where id=true;
set local role authenticated;
do $$
declare changed integer;
begin
 update public.profiles set display_name='Blocked edit' where id=auth.uid();
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Maintenance ON allowed player profile UPDATE'; end if;
 begin
  insert into public.profiles(id,username,display_name)
  values(auth.uid(),'test_player','Blocked upsert')
  on conflict(id) do update set display_name=excluded.display_name;
  raise exception 'Maintenance ON allowed player profile UPSERT';
 exception when insufficient_privilege then null;
 end;
 if (select display_name from public.profiles where id=auth.uid()) is distinct from 'Normal editing' then
  raise exception 'Blocked profile write changed stored data';
 end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$
begin
 begin
  insert into public.profiles(id,username) values(auth.uid(),'blocked_player');
  raise exception 'Maintenance ON allowed profile INSERT';
 exception when insufficient_privilege then null;
 end;
 if exists(select 1 from public.profiles where id=auth.uid()) then
  raise exception 'Blocked profile INSERT left a row';
 end if;
end $$;
-- Owner bypass applies to their own profile only.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
insert into public.profiles(id,username) values(auth.uid(),'test_owner');
insert into public.profiles(id,username,display_name)
values(auth.uid(),'test_owner','Owner editing')
on conflict(id) do update set display_name=excluded.display_name;
do $$
declare changed integer;
begin
 if (select display_name from public.profiles where id=auth.uid()) is distinct from 'Owner editing' then
  raise exception 'Maintenance ON blocked owner profile upsert';
 end if;
 update public.profiles set display_name='Owner direct edit' where id=auth.uid();
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Maintenance ON blocked owner UPDATE'; end if;
 update public.profiles set display_name='Cross-player edit' where id='00000000-0000-0000-0000-000000000001';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Owner bypass expanded profile ownership permissions'; end if;
 begin
  insert into public.profiles(id,username) values('00000000-0000-0000-0000-000000000003','cross_player');
  raise exception 'Owner bypass allowed another player profile INSERT';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
-- Missing flag must not silently permit writes; deletion is test-fixture-only.
delete from public.site_maintenance where id=true;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$
declare changed integer;
begin
 update public.profiles set display_name='Missing flag edit' where id=auth.uid();
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Missing maintenance flag allowed player UPDATE'; end if;
end $$;
reset role;
-- OFF restores player editing after maintenance.
insert into public.site_maintenance(id,enabled,message) values(true,false,'Maintenance');
set local role authenticated;
do $$
declare changed integer;
begin
 update public.profiles set display_name='Restored editing' where id=auth.uid();
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Maintenance OFF did not restore player UPDATE'; end if;
end $$;
reset role;
rollback;
