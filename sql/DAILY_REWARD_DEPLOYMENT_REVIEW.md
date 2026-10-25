# Cartoon Coin daily rewards — predeployment review

Status: REVIEW ONLY. Do not run on production until explicitly approved.

## Read-only production compatibility (2026-10-24)
- public.coin_wallets: user_id uuid primary key, balance bigint not null default 0 with nonnegative check, updated_at timestamptz.
- public.coin_transactions: id bigint GENERATED ALWAYS AS IDENTITY primary key, user_id uuid, amount bigint nonzero, reason text, created_at timestamptz.
- Both existing tables have RLS enabled and user foreign keys to auth.users.
- public.coin_daily_claims and public.claim_daily_cartoon_coins() do not exist in production.
- No production schema or player data was changed during review.

## Deployment sequence (requires separate approval)
1. Confirm feature branch is synchronized and GitHub Actions website/PostgreSQL jobs pass.
2. Recheck production schema, RLS, policies, table grants and dependencies before migration.
3. Take a verified backup/rollback plan and apply sql/cartoon_coin_daily_reward.sql separately from site deployment.
4. Verify authenticated users can read only their own claims and execute the RPC; anon cannot execute it.
5. Verify concurrent duplicate claims yield exactly one 25-coin award, and transaction/wallet balance remain consistent.
6. Verify old player accounts, balances, collections, games, and transactions are unchanged.
7. Only then approve web deployment and smoke-test wallet UI.

## Notes
- The UI now reads coin_daily_claims directly. It requires the migration to be applied first.
- The SQL function uses SECURITY DEFINER because clients cannot write wallet tables; confirm function owner, explicit EXECUTE grants, auth.uid() checks, and security advisors before release.
- A historical daily_reward transaction without a matching coin_daily_claims row may cause the button to offer a claim that the RPC correctly rejects. Consider read-only status RPC or historical backfill before launch.
- Do not assume a green check without verifying the exact latest commit.
- PR #40 and main may already contain the same earlier wallet files from a squash merge. Reconcile the existing branch history rather than force pushing or blindly merging.
