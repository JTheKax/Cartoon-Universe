# Production security review — 2026-10-26

**Status: reviewed, NOT approved for production execution.** This is a read-only evidence record for PR #56.

## Live evidence
- Public RLS policies were inspected successfully through `pg_catalog.pg_policies`. The Coin wallet, transaction and daily-claim SELECT policies require `auth.uid() = user_id`. The owner membership read policy is self-scoped.
- Profiles have permissive own-row INSERT/UPDATE policies plus restrictive own-row and owner/maintenance guard policies. Profile SELECT is permissive for PUBLIC (`true`); column privileges are therefore essential for controlling exposed fields.
- Maintenance SELECT is available to anon/authenticated; maintenance UPDATE policy requires membership in `owner_members`, and `updated_by = auth.uid()` for new values.
- `information_schema.table_privileges` confirms production grants: `anon SELECT` and `authenticated INSERT, SELECT, UPDATE` on `public.profiles`. These table-wide grants remain present. They are the reason for the review-only column-privilege proposal.
- Supabase security advisor still reports: authenticated callable SECURITY DEFINER `claim_daily_cartoon_coins()` (intentional privileged RPC requiring accepted risk) and disabled leaked-password protection.

## Assessment
- **RLS structure reviewed:** No obvious anonymous Coin read policy or general-player maintenance UPDATE policy in the inspected policy definitions.
- **Profile grant hardening still required:** Apply only after confirming app compatibility and an exact baseline/rollback. RLS does not limit which columns are returned by a permitted SELECT.
- **Not yet launch-approved:** Additional acceptance testing and separate production-change authorization required.

## Change control
Review-only SQL: `review/sql/supabase_hardening_proposal.sql`.
Checklist: `review/controlled-security-release-checklist.md`.
Never merge, deploy, apply SQL to production, alter Auth settings, or turn off maintenance as part of this evidence capture.
