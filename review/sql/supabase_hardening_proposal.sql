-- REVIEW-ONLY patch. Not an applied migration. Run only in disposable local CI.
-- Based on live public.profiles grants and current policies (2026-10-26).
BEGIN;

-- Authenticated users may update only the fields players can edit.
-- Preserve existing RLS owner + maintenance predicates.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (username, display_name, avatar_color, presence_mode)
  ON TABLE public.profiles TO authenticated;

-- Restrict anonymous reads to intentionally public profile attributes.
-- PostgreSQL table-level SELECT must be revoked before column grants help.
REVOKE SELECT ON TABLE public.profiles FROM anon;
GRANT SELECT (username, display_name, avatar_color)
  ON TABLE public.profiles TO anon;

-- Remove duplicate equivalent policies, preserving one INSERT and one UPDATE.
DROP POLICY IF EXISTS "insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;

-- Explicitly preserve the Coin RPC's current restricted caller roles.
REVOKE ALL ON FUNCTION public.claim_daily_cartoon_coins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_cartoon_coins() TO authenticated;

COMMIT;
