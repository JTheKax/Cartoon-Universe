-- REVIEW ONLY. Do not apply to production without an approved migration and backup.
-- The legacy membership table records one (user_id, sticker_id), not copy quantities.
-- This additive quantity ledger supports future verified awards, trades and removals.
CREATE TABLE IF NOT EXISTS public.ctoon_sticker_quantities (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 sticker_id uuid NOT NULL REFERENCES public.ctoon_sticker_catalog(id) ON DELETE CASCADE,
 quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0 AND quantity <= 1000000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, sticker_id)
);
ALTER TABLE public.ctoon_sticker_quantities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ctoon_sticker_quantities FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ctoon_sticker_quantities TO authenticated;
CREATE POLICY "Players can read their own Ctoon quantities"
 ON public.ctoon_sticker_quantities FOR SELECT TO authenticated
 USING (auth.uid() = user_id);
-- Do NOT grant INSERT/UPDATE/DELETE to clients. Award and transfer flows must
-- be separately audited and transactional; this file deliberately creates none.
-- Planned migration: each legacy ownership row may seed quantity=1 only after
-- confirming no pre-existing quantities; it cannot recover historic duplicates.
-- Do not show missing quantity rows as zero until migration and rollout are complete.

-- Privileged inventory writes must be implemented as an audited server-side
-- transaction. The table intentionally has no authenticated write grants.
-- A safe rollout must reconcile ownership and quantity records atomically.
