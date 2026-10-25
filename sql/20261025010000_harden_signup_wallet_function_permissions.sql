-- Security hardening for the existing auth.users signup trigger function.
-- REVIEW / RELEASE ONLY: this file has NOT been applied to production.
-- Revoking direct RPC execution does not prevent PostgreSQL from invoking the
-- function as an attached trigger. Do not drop or replace the existing trigger.
begin;

revoke execute on function public.create_coin_wallet_for_new_user()
  from public, anon, authenticated;

commit;

-- Post-apply read-only verification:
-- select
--   has_function_privilege('anon', 'public.create_coin_wallet_for_new_user()', 'EXECUTE') as anon_can_execute,
--   has_function_privilege('authenticated', 'public.create_coin_wallet_for_new_user()', 'EXECUTE') as authenticated_can_execute;
-- Both values should be false.
--
-- Then verify a new test user signup creates exactly one wallet row in a
-- disposable environment. Do not test by creating a real production account.
