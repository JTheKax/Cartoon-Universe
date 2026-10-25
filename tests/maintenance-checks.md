# Maintenance release checks

- Confirm the owner can read and save the notice.
- Confirm nonowners cannot update the maintenance record.
- Confirm the daily coin claim function blocks nonowners when maintenance is enabled, without changing balances, transactions, or daily-claim history.
- Confirm owner access is preserved.
- Confirm maintenance remains off until the site-wide server-side gate is ready.
- Check that all player pages show the advisory notice and that owner login remains reachable.
- Check GitHub CI and Render deployment before merging.

## Controlled staging verification (not production)

- Use an isolated Supabase project and a preview deployment with separate keys; never copy live player wallets, accounts, or sessions.
- Seed a test owner and a test nonowner with disposable accounts.
- Verify a nonowner cannot update site_maintenance and an owner can update only with their own updated_by identity.
- With maintenance OFF, verify normal player navigation and daily reward behavior using disposable wallets.
- With maintenance ON in staging only, verify a nonowner reward claim is rejected and wallet balances, transactions, and daily-claim history remain unchanged.
- Verify the owner can still sign in, open the owner dashboard, and disable maintenance.
- Check every player operation (coin rewards, purchases, trades, packs, auctions, game rewards) for server-side enforcement; do not infer protection from the overlay.
- Verify the static hosting boundary: HTML, JavaScript, and assets remain publicly fetchable unless protected by a server or edge gateway.
- Only unlock the ON/OFF control after all relevant operations are enforced and staging tests pass.

## Server-side enforcement inventory (GitHub-only review)

- Daily Cartoon Coin reward: `public.claim_daily_cartoon_coins()` is the existing transactional RPC. The proposed guarded migration at `supabase/maintenance-daily-reward-guard.sql` is executed directly in disposable CI. The production function is NOT updated by PR #51.
- Maintenance settings: `site_maintenance` uses owner-restricted RLS in the isolated fixture. Confirm live policy/grant parity separately before any deployment.
- Player shops, purchases, trades, auctions, sticker/card packs, and game rewards: do not treat the front-end pages or future feature placeholders as enforcement. Inventory each real RPC, database write policy, and edge/server endpoint as features are implemented; require maintenance ON denial for nonowners, owner bypass, and transaction rollback tests for every money/inventory mutation.
- Public static HTML, JavaScript, and assets: Render static hosting cannot prevent direct fetch. A server/edge gateway is required before claiming site-wide access restriction.
- Release gate: keep the owner ON/OFF control disabled, production maintenance OFF, and PR #51 in draft until server-side operations are fully covered, isolated tests pass, and a deployment architecture for static access is approved.

### GitHub CI coverage vs. remaining gaps

- Covered: maintenance UI safety, syntax, disposable owner/nonowner RLS, daily-reward maintenance ON/OFF and owner bypass.
- Not covered: live production RLS parity, real player transaction endpoints beyond the daily reward, site-wide static-asset gating, end-to-end staging login, and production state readback.
- No production Supabase data or settings should be modified to satisfy these checks.

### Verified repository call-site inventory (2026-10-25)

- `coin-wallet.js` calls `client.rpc('claim_daily_cartoon_coins')`; the daily reward RPC is a real server-side mutation requiring the guard before production activation.
- `coin-wallet.js` reads `coin_wallets`, `coin_transactions`, and `coin_daily_claims`. These are read paths, not evidence that shop/trade/auction mutation endpoints exist.
- `owner.js` reads `owner_members` and the profile count. Its owner UI is not a substitute for database RLS.
- `script.js` is a small static site script. Do not infer that the planned player shops, auctions, card packs, or game rewards are deployed from the feature roadmap.
- Before unlocking maintenance, enumerate actual deployed Supabase functions, policies, and any Render/edge API routes using read-only inspection. Apply server-side guards only to confirmed active mutation paths and test each with disposable accounts and wallets.

### Read-only production Supabase inspection (2026-10-25)

- Public tables observed: `profiles`, `owner_members`, `coin_wallets`, `coin_transactions`, `coin_daily_claims`, `site_maintenance`. RLS was enabled on all six at inspection time.
- Active Edge Function observed: `username-login` (version 3, `verify_jwt=false`). It checks POST and Origin, resolves a username via service-role profile lookup, then validates the supplied password through Supabase Auth. Review brute-force protection, throttling, and abuse monitoring before changing this authentication endpoint. Do not assume an Origin header is an authentication control.
- Supabase security advisor warned about `public.claim_daily_cartoon_coins()` being an executable SECURITY DEFINER function for authenticated users. This may be intentional for atomic rewards; verify its auth checks, execution grants, and maintenance guard before release.
- Supabase security advisor also reported leaked-password protection disabled; configure separately with owner approval.
- The read-only SQL catalog/function-body query was unavailable through the connector safety gate. Do not claim all deployed RPCs or the production `site_maintenance.enabled` value were independently checked.
- No production mutation, deployment, toggle, or merge was performed during this inspection.

### Reward transaction failure and concurrency checks

- The disposable CI database injects a ledger INSERT failure after wallet update and daily-claim insertion. It verifies rollback of all three records and a successful retry afterward.
- Two authenticated RPC sessions are held behind the same wallet row lock. CI verifies both are waiting before releasing the lock, then requires one 25-coin award, one duplicate response, a 125-coin balance, and exactly one linked ledger/claim pair.
- These checks use only the local GitHub Actions PostgreSQL fixture. They do not replace full Supabase staging login tests or the site-wide server/edge gateway requirement.

### Profile mutation enforcement (review only)

- Read-only production inspection confirmed `profiles` currently permits authenticated users to insert/update their own profile without a maintenance check. Production maintenance was independently read as OFF on 2026-10-25.
- `supabase/maintenance-controls-review.sql` now includes proposed restrictive INSERT/UPDATE policies. They preserve the existing own-profile policies and public profile reads, allow owner self-editing during maintenance, and deny nonowner writes if maintenance state is missing.
- CI loads the actual `supabase/schema.sql` and the exact proposed policies before testing player INSERT, UPDATE, and UPSERT blocking; unchanged profile data; owner bypass without cross-player privileges; missing-state denial; and maintenance OFF recovery.
- These policies have not been applied to production. Auth registration, password recovery, privileged triggers/functions, and site-wide static access still require separate review; profile RLS does not gate Supabase Auth.

### Staging HTTP gateway prototype

- `server/maintenance-gateway.mjs` provides a staging-only request gate with fresh maintenance checks, verified owner bypass, a short-lived opaque session cookie, noncacheable 503 responses, and an explicit published-file list.
- CI tests real local HTTP requests with mocked Supabase responses; no production or staging Supabase account is used. Owner sign-in remains reachable and staging `/config.js` is generated from separate staging environment values.
- See `tests/maintenance-gateway-staging.md` for launch settings, access behavior, exclusions, and the required real browser/Supabase verification. This prototype is not deployed and does not unlock the owner ON/OFF control.
