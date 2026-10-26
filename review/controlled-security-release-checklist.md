# Cartoon Universe — controlled security release checklist

**Review only.** No permission to merge, deploy, change live Supabase, or disable maintenance is implied by this document.

## Verified
- Draft PR #56 isolated PostgreSQL security CI passed at `a33ec186`.
- All four website-validation jobs passed on rerun of run 40405716780.
- Production Supabase public tables have RLS enabled (read-only table inspection).
- Live reward function uses `SECURITY DEFINER`, empty search_path, checks authenticated identity/anonymous status, maintenance state, and serializes wallet claims.

## Release blockers / approvals
1. **RLS policy inspection incomplete.** Connected live SQL policy queries were blocked; compare current `pg_policies` against expected owner/maintenance guards via authorized read-only dashboard inspection. Do not assume CI fixture exactly matches production.
2. **Review SQL before migration:** `review/sql/supabase_hardening_proposal.sql` limits profile INSERT/UPDATE and anonymous SELECT and scopes reward RPC EXECUTE. Confirm all public and owner clients still work; record a tested rollback script and backup/recovery plan.
3. **SECURITY DEFINER warning:** intentional authenticated access is required by `coin-wallet.js`. Review function ownership, EXECUTE grants and JWT checks. Consider isolated follow-up replacing deprecated `auth.role()`; do not switch to INVOKER without reworking wallet write permissions. https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
4. **Leaked-password warning:** decide whether to enable Supabase Auth leaked-password protection; verify plan availability and signup/recovery UX before changing the setting. https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
5. **Owner/player browser acceptance:** sign in as owner and as a non-owner player; verify maintenance access, restricted arcade routes, profile updates, and Coin daily claims without mutating production in review-only phase.
6. **Deployment approval:** only after explicit separate approval, prepare an actual migration, take recovery precautions, deploy in a controlled window, verify advisors, then separately decide on maintenance-off.

## Rollback considerations (planning only)
- Before changing grants, capture `pg_policies`, `information_schema.role_table_grants`, `information_schema.column_privileges`, and function EXECUTE privileges.
- Reversing the proposal by broadly regranting SELECT/INSERT/UPDATE is **not safe** without a review of the original grants. Restore the captured baseline precisely.
- Do not reverse maintenance policies or change `site_maintenance.enabled` as part of grant rollback.

No production SQL or Auth setting was changed while preparing this checklist.
