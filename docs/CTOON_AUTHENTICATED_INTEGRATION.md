# Authenticated CToon integration

The public static Sets Overview is currently a series browser, not an authenticated inventory view. The existing sticker collection prototype uses Supabase tables `sticker_sets`, `stickers`, and `player_stickers` with a signed-in user ID and read-only row-level security.

Next integration steps:

1. Reconcile the existing gateway's authentication configuration with the isolated sticker collection prototype. Never embed privileged database keys.
2. Read only published sets and stickers, and only inventory rows for the authenticated account. RLS must independently enforce ownership.
3. Fail closed on errors and incomplete pagination. Show `Ownership unavailable`, not `Need`, when the account or data cannot be verified.
4. Reuse the existing `sticker-collection-core.mjs` view model and wire per-sticker Owned/Need/duplicate quantities to My Collection and individual set details.
5. Test anonymous and cross-user access in an isolated Supabase environment before any deployment.

This branch does not modify production or apply SQL.