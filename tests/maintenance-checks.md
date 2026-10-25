# Maintenance release checks

- Confirm the owner can read and save the notice.
- Confirm nonowners cannot update the maintenance record.
- Confirm the daily coin claim function blocks nonowners when maintenance is enabled, without changing existing balances.
- Confirm owner access is preserved.
- Confirm maintenance remains off until the site-wide server-side gate is ready.
- Check that all player pages show the advisory notice and that owner login remains reachable.
- Check GitHub CI and Render deployment before merging.

## Controlled staging verification (not production)

- Use an isolated Supabase project and a preview deployment with separate keys; never copy live player wallets, accounts, or sessions.
- Seed a test owner and a test nonowner with disposable accounts.
- Verify a nonowner cannot update site_maintenance and an owner can update only with their own updated_by identity.
- With maintenance OFF, verify normal player navigation and daily reward behavior using disposable wallets.
- With maintenance ON in staging only, verify a nonowner reward claim is rejected and wallet balances/transactions remain unchanged.
- Verify the owner can still sign in, open the owner dashboard, and disable maintenance.
- Check every player operation (coin rewards, purchases, trades, packs, auctions, game rewards) for server-side enforcement; do not infer protection from the overlay.
- Verify the static hosting boundary: HTML, JavaScript, and assets remain publicly fetchable unless protected by a server or edge gateway.
- Only unlock the ON/OFF control after all relevant operations are enforced and staging tests pass.

## Server-side enforcement inventory (GitHub-only review)

- Daily Cartoon Coin reward: `public.claim_daily_cartoon_coins()` is the existing transactional RPC. The maintenance guard is currently injected only by `scripts/build-maintenance-reward-ci.mjs` into disposable CI; the production function is NOT updated by PR #51.
- Maintenance settings: `site_maintenance` uses owner-restricted RLS in the isolated fixture. Confirm live policy/grant parity separately before any deployment.
- Player shops, purchases, trades, auctions, sticker/card packs, and game rewards: do not treat the front-end pages or future feature placeholders as enforcement. Inventory each real RPC, database write policy, and edge/server endpoint as features are implemented; require maintenance ON denial for nonowners, owner bypass, and transaction rollback tests for every money/inventory mutation.
- Public static HTML, JavaScript, and assets: Render static hosting cannot prevent direct fetch. A server/edge gateway is required before claiming site-wide access restriction.
- Release gate: keep the owner ON/OFF control disabled, production maintenance OFF, and PR #51 in draft until server-side operations are fully covered, isolated tests pass, and a deployment architecture for static access is approved.

### GitHub CI coverage vs. remaining gaps

- Covered: maintenance UI safety, syntax, disposable owner/nonowner RLS, daily-reward maintenance ON/OFF and owner bypass.
- Not covered: live production RLS parity, real player transaction endpoints beyond the daily reward, site-wide static-asset gating, end-to-end staging login, and production state readback.
- No production Supabase data or settings should be modified to satisfy these checks.
