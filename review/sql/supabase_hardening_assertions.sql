-- READ-ONLY assertions for disposable database AFTER applying proposal.
-- Errors signal mismatched permissions. No INSERT/UPDATE/DELETE here.
DO $$
BEGIN
 IF has_table_privilege('anon','public.profiles','SELECT') THEN
   RAISE EXCEPTION 'anon has table-wide SELECT on profiles';
 END IF;
 IF NOT has_column_privilege('anon','public.profiles','username','SELECT')
 OR NOT has_column_privilege('anon','public.profiles','display_name','SELECT')
 OR NOT has_column_privilege('anon','public.profiles','avatar_color','SELECT') THEN
   RAISE EXCEPTION 'public profile column access missing';
 END IF;
 IF has_column_privilege('anon','public.profiles','id','SELECT')
 OR has_column_privilege('anon','public.profiles','presence_mode','SELECT')
 OR has_column_privilege('anon','public.profiles','created_at','SELECT') THEN
   RAISE EXCEPTION 'private profile columns remain exposed';
 END IF;
 IF has_column_privilege('authenticated','public.profiles','created_at','UPDATE')
 OR has_column_privilege('authenticated','public.profiles','updated_at','UPDATE')
 OR has_column_privilege('authenticated','public.profiles','id','UPDATE') THEN
   RAISE EXCEPTION 'protected profile columns still writable';
 END IF;
 IF has_function_privilege('anon','public.claim_daily_cartoon_coins()','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.claim_daily_cartoon_coins()','EXECUTE') THEN
   RAISE EXCEPTION 'Coin RPC caller permissions mismatch';
 END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND tablename='profiles' AND policyname IN ('insert own profile','update own profile')
 AND permissive='PERMISSIVE') <> 2 THEN
   RAISE EXCEPTION 'own-profile permissive RLS policies missing';
 END IF;
END $$;
