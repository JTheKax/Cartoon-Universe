# Cartoon Universe 3.0 — Sticker collecting (isolated review)

**Branch:** `review/sticker-collection-foundation` (based on `main`, not on an unmerged release branch).
**Status:** review-only; no production deployment, Supabase SQL execution, maintenance changes, public permissions, or billable resources.

## Built
- `sticker-collection.html`: signed-in player's **read-only** binder with owned/missing, rarity and album filters. Never writes to inventory.
- `sticker-albums.html`: album completion, unique owned count and duplicates, derived from the player's inventory.
- `owner-sticker-creator.html`: verifies Supabase Auth and `owner_members` before revealing a local-only draft preview. Publishing remains disabled.
- `sticker-collection-core.mjs`: deterministic view models; only relative `assets/stickers/` PNG/JPG/WebP paths can render as sticker artwork.
- `sql/review/20261028_sticker_inventory_proposal.sql`: **proposal only**, four RLS tables, read-only authenticated grants, and an audited, owner-checked sticker award RPC. This SQL is **not** a production migration.
- `sql/tests/sticker_inventory_security_test.sql`: runs only in a disposable PostgreSQL CI database. Mocks two auth identities, published/unpublished stickers, owner/nonowner awards and inventory isolation.

The catalog starts empty. No copyrighted franchise stickers or public image URLs are seeded. Sample data is used only inside tests.

## Security / release gates
1. Review all table grants, RLS, `SECURITY DEFINER` search path and RPC owner checks. Run the disposable database CI job and resolve all failures. Never trust the browser's owner label for authorization.
2. Review whether the site should permit public sticker browsing or signed-in-only browsing. This proposal grants **authenticated SELECT only** and does not grant `anon` or `PUBLIC` access.
3. Choose and approve media ownership/licensing rules, safe storage (private owner-only upload path), file-size/type validation, and image moderation. The creator currently uses a local `blob:` preview only.
4. Add a separate owner-only catalog-publish workflow and server-side grant/pack-opening logic with audit logs, rate limits, and abuse tests. No user can currently grant themselves stickers.
5. Test real owner and regular-player accounts in a *safe, isolated* preview after all checks pass. Browser-only access checks do not substitute for database RLS tests.
6. Reconcile with the unmerged clean-arcade/combined release work (including PR #62) before integration. This branch does not import unrelated unmerged changes.
7. Get explicit approval before applying any production SQL, changing maintenance, merging, or deploying.

## Known limitations
- Current production Supabase has not been changed. Until the reviewed schema is applied in an authorized environment, collection pages intentionally show "not enabled" instead of fake balances.
- Client catalog/inventory reads now use deterministic 500-row pages (up to 40 pages per section). If the limit is reached, the page fails closed rather than displaying misleading partial totals. Large catalogs still need performance/load testing before launch.
- No packs, player trading, uploads, or published sticker creator yet.
- The existing protected maintenance gateway needs a deliberate allowlist/CSP and packaging review for the new pages and scripts. **Do not deploy this branch to a publicly accessible static preview that bypasses maintenance.**
- Visual styling is adapted from the existing Cartoon Arcade and clean-arcade review; it is not a merge of those branches.

## Pagination follow-up (October 29, 2026)
- Added `collectPagedRows` with ordered, bounded, read-only pagination for sets, stickers, and the signed-in player's inventory.
- Added mock tests for a 1,203-row catalog, error propagation, invalid responses, and safe-limit exhaustion.
- The catalog remains empty until approved artwork and a reviewed backend are available. No production data was touched.

## Testing
```sh
node --check sticker-collection-core.mjs
node --check sticker-collection.js
node --check owner-sticker-creator.js
node --test tests/sticker-collection.test.mjs
```
The PR runs a separate disposable PostgreSQL 17 job applying the SQL proposal only inside CI.
