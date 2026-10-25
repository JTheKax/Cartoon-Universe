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
