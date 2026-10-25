-- REVIEW ONLY: Do not apply to production without explicit approval.
-- Harden existing signup trigger function without changing its definition or trigger.
-- PostgreSQL trigger invocation does not require the invoking user to have EXECUTE
-- privilege on the trigger function. Existing auth.users signup trigger remains.
begin;
revoke execute on function public.create_coin_wallet_for_new_user() from public, anon, authenticated;
commit;

-- Read-only verification after a separately approved deployment:
-- select has_function_privilege('anon','public.create_coin_wallet_for_new_user()','EXECUTE') as anon_can_execute,
--        has_function_privilege('authenticated','public.create_coin_wallet_for_new_user()','EXECUTE') as user_can_execute;
-- Expected: both false. Verify a disposable signup creates a coin_wallets row.
