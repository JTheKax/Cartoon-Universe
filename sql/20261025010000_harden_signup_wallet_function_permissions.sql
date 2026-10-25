-- Security hardening for the existing auth.users signup trigger function.
-- PRODUCTION STATUS: The equivalent REVOKE was applied to production Supabase
-- on 2026-10-25 and verified: anon and authenticated cannot directly EXECUTE.
-- This checked-in migration documents the production state and is idempotent.
-- DO NOT apply a second production migration solely because this PR is merged.
-- Revoking direct RPC execution does not prevent PostgreSQL from invoking the
-- function as an attached trigger. Do not drop or replace the existing trigger.
begin;

revoke execute on function public.create_coin_wallet_for_new_user()
  from public, anon, authenticated;

commit;

-- Verified in production on 2026-10-25:
--   has_function_privilege('anon', 'public.create_coin_wallet_for_new_user()', 'EXECUTE') = false
--   has_function_privilege('authenticated', 'public.create_coin_wallet_for_new_user()', 'EXECUTE') = false
--   existing signup trigger remained attached; existing wallets were preserved.
-- A disposable PostgreSQL integration test also confirmed that the signup
-- trigger still creates a wallet and direct execution is rejected.
-- No production test account was created during verification.
