# Recycler server-side launch requirements

The preview never changes coins or inventory. The sticker catalog schema is still under development; rarity is optional and may not exist yet.

Before enabling recycling:
1. Define and migrate canonical sticker catalog, player ownership and rarity values in an isolated Supabase project.
2. Implement an authenticated SECURITY DEFINER RPC with fixed search_path and tightly restricted EXECUTE grants. Use auth.uid() for user identity; never trust a client-supplied user ID, rarity, exchange rate, or coin amount.
3. Within one database transaction, lock the user's sticker inventory row and coin wallet row, check quantity > requested quantity (retain one), decrement owned quantity, credit coins, and append an auditable transaction record. Handle duplicate requests with idempotency keys.
4. Add daily limits and abuse controls, tests for negative/zero amounts, double-spends, concurrent requests, cross-user access, missing wallets, and rollbacks.
5. Make the preview exchange rates owner-configurable server-side before release. Require explicit launch approval before production changes.

No database migration or production deployment is performed by this PR.
