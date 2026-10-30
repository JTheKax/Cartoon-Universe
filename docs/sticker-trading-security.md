# Sticker Trading launch requirements

Current prototype: authenticated read-only duplicate inventory and a local-only proposal preview. No server-side trade invitations or transfers.

Before enabling trading:
1. Define canonical sticker catalog and player_stickers ownership tables with RLS. Identify trade partners by immutable authenticated user IDs, never display names alone.
2. Create trade_offers and trade_offer_items with owner/recipient IDs, sticker IDs, quantities, expiry and state. Enforce ownership and reserve offered duplicates using server-side transactions.
3. Accept/decline/cancel using narrowly granted authenticated RPCs. For acceptance, lock both players' inventory rows in a deterministic order, verify offered and requested inventory, perform atomic exchange, and write immutable audit entries. Prevent last-copy loss if policy requires it.
4. Test duplicate acceptance, simultaneous trades, changed inventories, self-trading, unauthorized users, replay, cancellations, expiry, and partial failure rollback.
5. Add moderation, rate limits, blocked-user checks and notifications. Require explicit approval before production migrations and deployment.
