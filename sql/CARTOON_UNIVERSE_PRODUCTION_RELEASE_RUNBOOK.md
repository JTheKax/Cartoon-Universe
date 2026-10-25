# Cartoon Universe 3.0 — Production backup, rollback and release runbook

**Status: REVIEW ONLY — NO production changes authorized.** Scope: PR #41 (`feature/cartoon-coin-release`), existing daily-reward migration `sql/cartoon_coin_daily_reward.sql`, and review-only permission hardening `sql/review_wallet_signup_trigger_permissions.sql`. Owner approval required separately for **each** production database change, PR merge, and deployment.

## 0. Release gates / responsibilities

- Release owner: verify exact PR head SHA, diff, approved change window, and GitHub Actions website + isolated PostgreSQL jobs on that exact SHA. Previous run #134 passed at `739dcb7`; **new commits require new checks**.
- Database operator: confirm Supabase project ID `gjfyemvcrgrthbrlqqnz` and environment before running anything. Never paste credentials, database dumps, user data, or service-role keys into GitHub/CI/chat.
- Establish restore owner, incident contact, downtime budget, backup location, encryption/access control, retention, and exact recovery-point/recovery-time objectives (RPO/RTO). Record timestamps and approvals outside the repository.
- Confirm actual backup/PITR availability and restore procedures for the project's Supabase plan. **A backup is not verified until a restore has been tested in a separate isolated project/database**. Do not assume automatic backups or PITR exist.
- Freeze other schema and wallet changes for the approved change window. Record the current deployment SHA, migration history, auth configuration, and full schema inventory. Stop if any prerequisite is unmet.

## 1. Pre-change inventory (read-only)

- Enumerate `public` tables, views, functions, triggers, policies, grants, indexes, foreign keys, sequences, and relevant `auth.users` dependencies; include player profiles, coins, collections, stickers, cards, shop, trades, games, and progress. Do not assume a table name based on the UI.
- Record counts and referential-integrity checks for all identified player-owned tables; capture wallet count, wallet sum, transaction count and aggregate, daily-claim count (if present), and known constraints. Store only sanitized aggregates in the release record; no player IDs or PII.
- Confirm `coin_wallets.balance` is nonnegative and `coin_transactions.id` is GENERATED ALWAYS AS IDENTITY; verify both tables' RLS SELECT-only owner policies.
- Check for existing `coin_daily_claims`, `claim_daily_cartoon_coins()`, and any historic `daily_reward` transactions. If objects exist unexpectedly, **stop** and reconcile; `CREATE OR REPLACE` could overwrite customized behavior.
- Re-run Supabase security advisors. Known review findings: `public.create_coin_wallet_for_new_user()` executable by `anon` and `authenticated`; leaked-password protection disabled. Review other new findings separately.
- Verify signup trigger `on_auth_user_create_coin_wallet` on `auth.users` still references `public.create_coin_wallet_for_new_user()`.

## 2. Backup and isolated restore — mandatory before release

1. Using the approved Supabase dashboard/CLI or PostgreSQL-native tooling, create or confirm a **consistent point-in-time** backup with database schema and data, including `auth` identities, `public` player records, functions, policies, triggers, sequences and migration metadata. Determine what managed Supabase backups actually include. Export or separately safeguard external assets (Storage objects, secrets/configuration, Render deployment config) using their respective supported mechanisms; a database dump alone is insufficient.
2. Protect backup artifacts with encryption, access restrictions, off-site retention and documented expiration. Do not commit artifacts or credentials to GitHub.
3. Restore to a **disposable isolated environment**, never production. Verify representative counts, foreign keys, sample sanitized wallet/transaction reconciliation, auth-to-wallet relationships, and critical application queries. Document backup ID, restore test time, operator, result and recovery time in a private change record.
4. Confirm the restore procedure can recover both database and externally stored assets/configuration. If unable to restore, **NO GO**.

## 3. Staged deployment order (only after explicit separate approval)

1. Recheck current production schema and release gates. Confirm application compatibility with both pre- and post-migration schema.
2. Apply `sql/review_wallet_signup_trigger_permissions.sql` in a separately approved, controlled transaction. Verify `anon` and `authenticated` cannot EXECUTE the trigger function, while a **test signup in an isolated environment** still creates a wallet. Do not perform an unapproved production signup.
3. Apply `sql/cartoon_coin_daily_reward.sql` **before** deploying a wallet UI that reads `coin_daily_claims`. Capture migration outcome and lock/timeout behavior. Never apply it twice blindly; check existing objects first.
4. Confirm RLS and grants: authenticated users can SELECT only their own claims; anonymous users cannot SELECT claims or EXECUTE the reward RPC; authenticated users cannot INSERT/UPDATE/DELETE wallet, transaction or claim rows directly; reward RPC derives user ID from `auth.uid()` and never accepts an amount.
5. Test with isolated accounts: one award of exactly 25 coins per UTC day; duplicate and simultaneous requests award no additional coins; anonymous requests denied; a failed transaction rolls back wallet and claim changes; previous same-day reward transaction blocks duplicate credit; next reset is UTC midnight. Verify wallet balances and ledger entries agree.
6. Compare pre/post sanitized counts for accounts, collections, games, cards, stickers, shop and progress. Existing balances must be unchanged **until** a deliberately executed reward claim. Confirm signup trigger still works.
7. Only after separate authorization, merge/deploy the approved exact commit and smoke-test wallet UI, login/logout, history, already-claimed status, and old accounts. Monitor errors, wallet drift, unexpected duplicate credits and auth failures.

## 4. Stop / rollback decision tree

- **Before SQL commit:** abort/ROLLBACK the current transaction on any error. Neither reviewed SQL script should partially commit its own transaction.
- **After permission hardening, before reward migration:** if signup trigger behavior or grants fail verification, stop. The preferred correction is a separately approved minimal grant/permission change after confirming exact prior ACLs. Do not blindly restore broad PUBLIC access.
- **After reward migration, before any reward claims:** safest operational rollback is to **keep schema in place** and revert/disable the new UI or feature flag (if available), then fix forward. Do not DROP the claims table or function without reviewing dependencies and data.
- **After claims have been awarded:** **never delete `coin_daily_claims`, erase `coin_transactions`, subtract coins, or restore an old snapshot over a live database without an explicit reconciliation and data-loss approval**. A full restore can erase signups, purchases, trades, claims and progress occurring since the backup. Preserve an audit of all post-backup writes and choose controlled forward repair or tested point-in-time recovery with a documented reconciliation/cutover plan.
- **Application regression:** roll back Render to the last known-good deployment only after checking that the old application tolerates the additive database schema. This is an application rollback, not a database restore.
- **Security incident / data corruption:** freeze relevant writes if operationally possible, preserve logs, assess blast radius, notify owner, choose isolated PITR/restore target, validate counts and ledger, reconcile writes after recovery point, then approve cutover.
- Define stop conditions: CI red, unexpected schema drift, backup restore unverified, excessive locks, any unauthorized balance mutation, duplicate reward, broken signup, cross-user data access, or data mismatch.

## 5. Post-release checks and acceptance

- Record exact deployed commit, migration hashes, operators, timestamps and approvals privately.
- Verify HTTP availability, authentication, wallet display, daily reward RPC, UTC reset, history and owner-only controls.
- Compare protected aggregates and integrity checks at +0, +30 minutes, +24 hours and after UTC midnight. Monitor transaction errors and unexpected reward counts; escalate anomalies.
- Confirm no change to unrelated player data. Review security advisors again and separately decide whether to enable leaked-password protection.
- Mark release complete only when all gates and sign-offs pass. Until then, keep PR #41 in **draft** and do not merge or deploy.

## 6. Evidence / approval record template (keep private)

- Production project and environment confirmed: ___
- Approved release commit / GitHub Actions URL: ___
- Backup type, backup ID, restore test ID and timestamp: ___
- Coverage: DB/auth/storage/config confirmed: ___
- Baseline sanitized metrics and schema hash: ___
- Approved SQL scripts and exact SHA256 hashes: ___
- Database migration authorization: ___
- Merge authorization: ___
- Deployment authorization: ___
- Verification results / incident log / sign-off: ___

**This runbook is documentation only. Creating it does not authorize backup execution, database migration, PR merge or deployment.**
