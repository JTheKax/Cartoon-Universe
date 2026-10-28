# Cartoon Universe — controlled security release checklist

**Review only.** No permission to merge, deploy, change live Supabase, or disable maintenance is implied by this document.

## Verified (2026-10-26 review)
- PR #56 security review branch `security/supabase-hardening-review` is 29 commits ahead of `main`, zero behind at review time.
- All six isolated checks passed at commit `44a67dc33785177de607b049af5e88c5956f7c5c`: four website-validation jobs, isolated gateway integration, and disposable-database Supabase hardening.
- Local Supabase integration covers signup and password-recovery **request**; full reset-link completion is not yet demonstrated.
- Production public tables had RLS enabled in earlier read-only inspection; a complete current policy-by-policy comparison is still required.
- Production `public.claim_daily_cartoon_coins()` was read-only inspected: `SECURITY DEFINER`, empty search_path, signed-in non-anonymous identity guard, maintenance owner exception, per-wallet row lock, historical reward check, and 25-coin UTC daily award.
- Production `coin_daily_claims` primary key is `(user_id, reward_date)`, with a unique transaction ID constraint.
- Live function EXECUTE: `anon=false`, `authenticated=true`. This access is intentional for player rewards; retain risk acceptance pending final review.
- Production Supabase Auth leaked-password protection remains **disabled**. Attempting to enable it returned an explicit Pro-plan-only error; **keep the Free plan**, do not upgrade or create billable branches.
- GitHub PR #56 currently has no submitted reviews or review threads.

## Remaining release gates
1. Compare live `pg_policies`, grants, owner permissions and maintenance guards with the proposed protections; avoid treating disposable CI as proof of production configuration.
2. Review `review/sql/supabase_hardening_proposal.sql` against live state and determine which changes, if any, are still needed. Capture precise rollback grants and a recovery plan before any authorized migration.
3. Record acceptance of the intentional authenticated `SECURITY DEFINER` daily reward RPC. Its `auth.role()` check can be modernized separately in isolated tests; do not switch to invoker without redesigning wallet permissions.
4. Document Free-plan leaked-password protection limitation; maintain existing password and login protections without upgrading.
5. Complete owner and non-owner browser acceptance, protected arcade access, signup/recovery-link completion, and Coin daily-claim behavior in an authorized test environment. Do not mutate live data during review-only checks.
6. Obtain explicit approval **separately** for merge, deployment, and later disabling maintenance. After any approved deployment, verify advisors, routes, login and Coin behavior before public launch.

## Rollback considerations (planning only)
- Before changing grants, capture `pg_policies`, `information_schema.role_table_grants`, `information_schema.column_privileges`, and function EXECUTE privileges.
- Broadly regranting SELECT/INSERT/UPDATE is unsafe; restore the captured baseline precisely.
- Never turn off maintenance as part of a security-grant rollback.

No production SQL, Auth configuration, plan, deployment, or maintenance state was changed by this checklist update.
