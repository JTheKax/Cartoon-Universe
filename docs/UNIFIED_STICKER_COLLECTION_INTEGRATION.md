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

## Deployment readiness gate (2026-10-31)

**Status: NOT YET READY TO MERGE OR DEPLOY.** Missing logos are deferred and must retain visible text fallbacks; they are not a release blocker.

- [x] Five planned categories and 44 distinct subseries in the review catalog.
- [x] Clickable category and series links, with missing-logo text fallback.
- [x] Ctoon terminology in collection, album, owner draft, homepage, and series views.
- [x] Read-only authenticated player inventory and Owned/Need calculations in the review code.
- [x] Add catalog integration tests to both the review and main validation workflows.
- [ ] GitHub Actions passes for the exact final review commit (including collection, catalog, site and local Supabase checks).
- [ ] Browser smoke test: mobile/desktop category links, empty Movies/Misc, fallback logos, logged-out and player states.
- [ ] Verify proposed sticker inventory schema and RLS against a disposable Supabase environment; check compatibility with existing production schema before any migration.
- [ ] Verify real published catalog entries, album slug/series matching, player-specific inventory and artwork rights.
- [ ] Confirm review/production navigation and links are compatible with the live site's deployment entry point.
- [ ] Obtain explicit approval before merging or deploying.

No production database changes or artwork import are authorized by this checklist.
