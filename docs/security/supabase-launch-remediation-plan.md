# Supabase launch security remediation plan (REVIEW ONLY)

Status: proposal, not applied. Scope: Cartoon Universe Supabase project `gjfyemvcrgrthbrlqqnz`. This branch contains documentation only. **Do not deploy, merge, or execute the SQL without isolated tests and approval.**

## P0 — launch gates
1. Enable Supabase Auth leaked-password protection in dashboard after checking plan support. Verify advisor warning clears. This is a dashboard setting, not SQL.
2. Test isolated anon, ordinary player A/B, and owner identities: owner membership cannot be forged; maintenance update denied for player and allowed for owner; no cross-user profile/coin access; protected arcade access denied anonymously. Never test by modifying production records.

## P1 — proposed SQL, not executable migration
### Profile timestamp column permissions
```sql
-- PROPOSAL ONLY; verify application upserts and triggers before applying.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, display_name, avatar_color, presence_mode)
  ON public.profiles TO authenticated;
```
RLS owner/maintenance guards remain in force. Consider a reviewed trigger to manage `updated_at` and preserve `created_at`. Also audit whether INSERT should permit caller-provided timestamps.

### Public profile visibility
Current anonymous SELECT on public.profiles exposes: id, username, display_name, avatar_color, created_at, updated_at, presence_mode. Decide whether UUID, presence and timestamps are intended to be public. An illustrative alternative:
```sql
-- PROPOSAL ONLY: view alone does not restrict access to base table.
CREATE VIEW public.public_player_profiles
WITH (security_invoker = true)
AS SELECT username, display_name, avatar_color FROM public.profiles;
GRANT SELECT ON public.public_player_profiles TO anon, authenticated;
-- Only AFTER migrating client reads and verifying permissions:
-- REVOKE SELECT ON public.profiles FROM anon;
-- Review public SELECT policy and authenticated visibility separately.
```
With `security_invoker=true`, the view respects underlying table permissions/RLS; revoking base-table access can also break view reads. Design/test an appropriate access model (e.g. narrow column grants or separate published table) before executing this proposal.

### Cartoon Coin RPC
`public.claim_daily_cartoon_coins()` is SECURITY DEFINER, callable by authenticated but not anon. Its code checks auth.uid(), anonymous JWT claim, maintenance owner exemption, daily uniqueness and per-wallet locking. Preserve restricted grants and test with isolated fixtures:
```sql
-- PROPOSAL ONLY; current effective permissions already match.
REVOKE ALL ON FUNCTION public.claim_daily_cartoon_coins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_cartoon_coins() TO authenticated;
```
Review deprecated `auth.role()` usage, SECURITY DEFINER search_path and function ownership. Do not change to SECURITY INVOKER without redesigning write authorization.

## P2 — cleanup
Two INSERT and two UPDATE profile policies duplicate equivalent conditions. Consolidate only after comparing effective permissive-policy behavior and testing.

## Verification matrix (isolated database only)
| Scenario | Expected |
|---|---|
| anon reads public profile | Only approved public fields |
| anon writes profile, maintenance, coin | Denied |
| player A reads player B coin rows | Denied |
| player A updates own profile | Allowed only when maintenance permits |
| player A alters created_at/updated_at | Denied / server managed |
| player A updates maintenance or owner_members | Denied |
| owner updates maintenance with updated_by=auth.uid() | Allowed |
| player claims Coin during maintenance | Denied |
| owner claims during maintenance | Permitted if otherwise eligible |
| same player claims twice UTC day | One award of 25, then zero |
| concurrent duplicate claim attempts | One award total |
| anonymous invokes Coin RPC | Denied |
| leaked-password advisor after enabling | Warning cleared |

## Rollout controls
- Test on existing isolated/free CI database; **do not create billable Supabase branches**.
- Capture schema snapshot and current grants, RLS, functions, auth settings.
- Run tests and advisor scan; review frontend API dependencies.
- Require explicit owner approval before any production SQL, setting changes, merge, or deploy.
- Recheck public maintenance and owner gateway after an approved future release.

## Observed warnings
- Auth leaked-password protection disabled.
- Supabase security advisor flags authenticated execution of SECURITY DEFINER `claim_daily_cartoon_coins()` (may be intentional, requires security review).
