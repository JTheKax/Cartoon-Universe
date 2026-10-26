-- Disposable CI only; all attempted table mutations run in a rollback transaction.
\set ON_ERROR_STOP on
begin;
do $$
declare role_name text; table_name text; privilege_name text; expected boolean;
begin
 foreach role_name in array array['anon','authenticated'] loop
  foreach table_name in array array['profiles','owner_members'] loop
   foreach privilege_name in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
    expected := (table_name='profiles' and privilege_name='SELECT' and role_name='authenticated')
     or (role_name='authenticated' and table_name='owner_members' and privilege_name='SELECT');
    if has_table_privilege(role_name,'public.'||table_name,privilege_name) is distinct from expected then
     raise exception 'Unexpected % privilege on % for %',privilege_name,table_name,role_name;
    end if;
   end loop;
  end loop;
 end loop;
end $$;
set local role anon;
do $$
begin
 begin
  truncate public.profiles;
  raise exception 'Anonymous role unexpectedly truncated profiles';
 exception when insufficient_privilege then null;
 end;
 begin
  truncate public.owner_members;
  raise exception 'Anonymous role unexpectedly truncated owner membership';
 exception when insufficient_privilege then null;
 end;
 -- The existing public-profile read contract must survive hardening.
 perform username from public.profiles;
 begin
  perform id from public.profiles;
  raise exception 'Anonymous role unexpectedly read protected profile id';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local role authenticated;
do $
begin
 if has_table_privilege('authenticated','public.profiles','INSERT') then
  raise exception 'Authenticated profile INSERT must be column-scoped';
 end if;
 if not has_column_privilege('authenticated','public.profiles','id','INSERT')
    or not has_column_privilege('authenticated','public.profiles','username','INSERT') then
  raise exception 'Authenticated profile INSERT columns unavailable';
 end if;
end $;
do $
begin
 if not has_column_privilege('authenticated','public.profiles','username','UPDATE')
    or not has_column_privilege('authenticated','public.profiles','display_name','UPDATE')
    or not has_column_privilege('authenticated','public.profiles','avatar_color','UPDATE')
    or not has_column_privilege('authenticated','public.profiles','presence_mode','UPDATE') then
  raise exception 'Authenticated player editable profile columns not writable';
 end if;
 if has_column_privilege('authenticated','public.profiles','id','UPDATE')
    or has_column_privilege('authenticated','public.profiles','created_at','UPDATE')
    or has_column_privilege('authenticated','public.profiles','updated_at','UPDATE') then
  raise exception 'Authenticated role can update protected profile columns';
 end if;
end $$;
do $$
begin
 begin
  truncate public.profiles;
  raise exception 'Authenticated role unexpectedly truncated profiles';
 exception when insufficient_privilege then null;
 end;
 begin
  truncate public.owner_members;
  raise exception 'Authenticated role unexpectedly truncated owner membership';
 exception when insufficient_privilege then null;
 end;
 begin
  delete from public.owner_members;
  raise exception 'Client role unexpectedly has owner membership DELETE privilege';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
