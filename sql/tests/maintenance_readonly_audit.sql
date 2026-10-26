-- Read-only security audit, safe to run against production.
-- Does not toggle maintenance or alter any player records.
select policyname,cmd,roles,qual,with_check
from pg_policies
where schemaname='public' and tablename in ('site_maintenance','owner_members')
order by tablename,policyname;

select grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name='site_maintenance'
  and grantee in ('anon','authenticated')
order by grantee,privilege_type;

select enabled from public.site_maintenance where id=true;

select position('Cartoon Universe is temporarily under maintenance'
  in pg_get_functiondef(p.oid))>0 as daily_reward_guard_installed
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='claim_daily_cartoon_coins';
