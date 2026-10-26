# Supabase hardening implementation — isolated review branch

**DO NOT apply to production.** This branch is a review-only implementation proposal. No Supabase migration is automatically wired to deploy. SQL is deliberately placed in `review/sql/`, not the migrations directory.

## Changes in SQL proposal
- Prevent player UPDATE of profile `id`, `created_at`, and `updated_at` while keeping editable columns.
- Reduce anonymous SELECT to `username`, `display_name`, and `avatar_color`; `id`, timestamps and presence remain available to authenticated users under existing policies.
- Drop two duplicate policies while retaining `profile_insert_owner_and_maintenance_guard` and `profile_update_owner_and_maintenance_guard`.
- Explicitly preserve the current daily Cartoon Coin RPC execute permission: authenticated only.

## Compatibility review required
- Anonymous frontend profile queries selecting `id`, `presence_mode`, or timestamps will break. Review and adjust the client before applying.
- Profile INSERT still allows client-provided `created_at` and `updated_at`; server-side timestamp defaults and trigger protections need separate implementation and testing.
- Authenticated users retain public SELECT of all profiles by existing policy; confirm desired privacy model.
- `claim_daily_cartoon_coins()` remains SECURITY DEFINER and contains deprecated `auth.role()` usage; its existing authorization guards remain intact. Separate review needed for function body changes.
- Leaked-password protection is an Auth dashboard configuration; it cannot be enabled by this SQL.
- Avoid new paid Supabase branches.

## Isolated verification
1. Start existing disposable local Supabase/Postgres CI environment, load production-equivalent migrations and auth role grants.
2. Apply `review/sql/supabase_hardening_proposal.sql` **only to that disposable database**.
3. Run `review/sql/supabase_hardening_assertions.sql` (read-only assertions).
4. Use isolated test accounts for actual allowed/denied SELECT, INSERT, UPDATE, RPC and maintenance behavior. Confirm cross-user data denied; Coin daily reward once only; owner maintenance works.
5. Run existing website, maintenance browser, isolated Cartoon Coin and real local Supabase CI suites.
6. Check client queries for regressions; re-run security advisors.
7. Request explicit approval before turning reviewed SQL into a migration or changing Auth settings.

Passing existing CI alone is **not** evidence this SQL proposal was applied or tested. CI must explicitly execute the review SQL in a disposable environment.
