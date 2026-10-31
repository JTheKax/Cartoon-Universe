# Unified Ctoon sticker collection integration

## Source audit (2026-10-31)

- Base branch: `feature/per-user-sticker-ownership-20261030` contains `sets-overview.html`, `sets-overview.js` and draft Video Games catalog.
- PR #63 contains an isolated sticker collection and album foundation; it is not automatically present on this branch.
- PR #148 includes the 90-series Video Games draft, but describes artwork, ownership and release compatibility as pending.
- Do not equate draft sets with published individual stickers or grant ownership from catalog rows.

## Integration requirements

1. Reconcile the live/default-branch catalog and all source branches before changing or removing any series or sticker IDs. Preserve existing stable identifiers and logo paths.
2. Build one normalized catalog of category → series → subseries → individual sticker, with deduplication and deterministic alphabetical ordering (Misc last).
3. Keep all series and subseries clickable, including Video Games; show honest Coming Soon state where a set has no published sticker records.
4. Connect Owned/Need exclusively to authenticated, RLS-protected per-user inventory. Never infer ownership from sample or draft data.
5. Test owner and ordinary-player visibility, anonymous restrictions, responsive navigation, missing-logo fallbacks, and direct links. Validate database migrations in disposable infrastructure.
6. Require passing CI, production schema compatibility and artwork rights review before merging or deploying. No production mutations from this review branch.

## Current state

This document initiates integration review only. It does not claim the collection has been merged, published or deployed.


## Inventory schema reconciliation (2026-10-31)

**Canonical collection contract for this review:** `public.sticker_sets` (album metadata), `public.stickers` (published sticker records), and `public.player_stickers` (authenticated per-player quantities). These are the tables the current `sticker-collection.js` reads. The SQL in `sql/review/20261028_sticker_inventory_proposal.sql` is a **review proposal**, not proof those tables exist in production.

**Separate incompatible proposal:** `supabase/migrations/20261030180000_ctoon_sticker_ownership.sql` defines `public.ctoon_sticker_catalog` and `public.ctoon_sticker_ownership`, which are **not** read by the current collection UI. Do **not** apply this migration as a way to enable the UI, and do not populate both schemas independently. The separate ownership table also has no quantity column, so it cannot directly preserve duplicates.

**Safe reconciliation sequence:** (1) inspect actual production schema read-only and inventory row counts without exposing user records; (2) select one canonical model preserving existing sticker IDs and player quantities; (3) write a reviewed, idempotent migration or compatibility view only if necessary; (4) test RLS for anonymous, player A, player B, and owner in a disposable Supabase project; (5) verify collection page queries and published album mappings; (6) request explicit production migration and deployment approval. No production SQL has been executed here.


## Verified database compatibility (read-only inspection, 2026-10-31)

The connected Supabase projects were inspected using `information_schema` only. **Production Cartoon Universe** (`gjfyemvcrgrthbrlqqnz`) returned no public table names containing `sticker`; **nonproduction Yu-Gi-Oh Card Shop Test** (`dcunaehkbbybrzxrheai`) contains `ctoon_sticker_catalog`, `ctoon_sticker_ownership`, and `ctoon_stickers`, but not `sticker_sets`, `stickers`, or `player_stickers`.

Test database columns: `ctoon_sticker_catalog(id, series, subseries, sticker_code, title, artwork_url, published, created_at)`; `ctoon_sticker_ownership(user_id, sticker_id, acquired_at, acquisition_source)`; `ctoon_stickers(id, series_key, sticker_key, title, created_at)`. The ownership table has **no quantity column**. The present collection UI therefore cannot yet read either connected project's observed schema directly. This is a confirmed release blocker, not evidence of lost player inventory. These results are schema metadata only; no rows or ownership records were read or modified.

### Proposed compatibility approach (not executed)

1. Treat `ctoon_sticker_catalog.id` as the candidate stable sticker identifier and `ctoon_sticker_ownership(user_id, sticker_id)` as a candidate membership relation **only after verifying foreign keys, RLS, grants, row counts and existing application reads**.
2. Determine whether `ctoon_stickers` is a legacy catalog or separate active source before mapping or merging it. Never delete or rewrite its records based on table names alone.
3. Establish whether duplicates exist elsewhere (e.g., an events or inventory table). Do not manufacture quantity=1 as an authoritative duplicate count. If ownership is membership-only, show Owned/Need without claiming duplicate quantities.
4. Adapt the collection's read-only data access behind an explicit schema adapter or create reviewed compatibility views with `security_invoker=true` where supported. Keep unpublished catalog rows hidden and ownership scoped to the authenticated user; do not expose cross-user inventory.
5. In a disposable environment, seed two users and published/unpublished stickers; verify anonymous restrictions, user isolation, missing series behavior, and zero-write access. Run the full collection and site CI after implementation.
6. Confirm the actual production source of sticker data and obtain explicit approval before any migration or release. **No migration or data copy has been executed.**

## Deployment readiness gate (2026-10-31)

**Status: NOT YET READY TO MERGE OR DEPLOY.** Missing logos are deferred and must retain visible text fallbacks; they are not a release blocker.

- [x] Five planned categories and 44 distinct subseries in the review catalog.
- [x] Clickable category and series links, with missing-logo text fallback.
- [x] Ctoon terminology in collection, album, owner draft, homepage, and series views.
- [x] Read-only authenticated player inventory and Owned/Need calculations in the review code.
- [x] Add catalog integration tests to both the review and main validation workflows.
- [x] GitHub Actions passed for commit b93433955cb84ca258fa9188fe87076a2a7f0a52 (collection review and website validation, including isolated database and local Supabase integration). Re-run for any subsequent commit.
- [ ] Browser smoke test: mobile/desktop category links, empty Movies/Misc, fallback logos, logged-out and player states.
- [ ] Verify proposed sticker inventory schema and RLS against a disposable Supabase environment; check compatibility with existing production schema before any migration.
- [ ] Verify real published catalog entries, album slug/series matching, player-specific inventory and artwork rights.
- [ ] Confirm review/production navigation and links are compatible with the live site's deployment entry point.
- [ ] Obtain explicit approval before merging or deploying.

No production database changes or artwork import are authorized by this checklist.
