-- READ ONLY: production preflight. DO NOT APPLY THE REVIEW PATCH HERE.
-- Execute with a read-only SQL connection after independent approval.
-- All statements are SELECT only; no data rows, secrets, or user identifiers.
SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
('profiles','owner_members','coin_wallets','coin_transactions','coin_daily_claims','site_maintenance')
ORDER BY c.relname;

SELECT policyname,cmd,permissive,roles,qual,with_check
FROM pg_policies WHERE schemaname='public'
AND tablename IN ('profiles','owner_members','site_maintenance',
'coin_wallets','coin_transactions','coin_daily_claims')
ORDER BY tablename,policyname;

SELECT role_name,
has_table_privilege(role_name,'public.profiles','SELECT') AS table_select,
has_table_privilege(role_name,'public.profiles','INSERT') AS table_insert,
has_table_privilege(role_name,'public.profiles','UPDATE') AS table_update,
has_column_privilege(role_name,'public.profiles','id','SELECT') AS id_select,
has_column_privilege(role_name,'public.profiles','created_at','INSERT') AS created_at_insert,
has_column_privilege(role_name,'public.profiles','updated_at','UPDATE') AS updated_at_update
FROM (VALUES ('anon'),('authenticated')) roles(role_name);

SELECT p.proname,p.prosecdef,p.proconfig,
has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='claim_daily_cartoon_coins';
