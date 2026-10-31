# Ctoon completion release gates

Tracking: #156. Integration sources: #153, #154, #155.

## Collection catalog
- [ ] Reconcile Cartoons, Anime, Movies, Video Games, Misc across Sets Overview, My Collection, and shop.
- [ ] Verify all requested series, clickable details, existing uploaded official logos, fallback text, and unique stable Ctoon IDs.
- [ ] Show Ctoon rarity, set, series and artwork consistently.

## Per-player inventory
- [ ] Read inventory only for authenticated player; count quantity per Ctoon, Owned/Need, duplicates, and completion ratios.
- [ ] Verify Supabase RLS with two different player accounts and anonymous user.
- [ ] Confirm inventory updates correctly after purchases, grants, recycling, and trading; never trust client-submitted balance or ownership.

## Shop and owner tools
- [ ] Verify individual Ctoons and packs, server-side coin debit and inventory credit in a single atomic transaction, idempotency and insufficient-funds checks.
- [ ] Verify owner-only artwork uploads, series assignment, rarity, drafts and publish; prohibit player privilege escalation.

## Release checks
- [ ] Reconcile changes from PRs #153–155 without losing other site navigation or theater features.
- [ ] Run tests and CI; check migration compatibility, rollback, and preservation of existing collection records.
- [ ] QA full-site preview as anonymous, player and owner; validate links and mobile layout.
- [ ] Record preview URL and CI evidence before any production merge or deploy.

Do not deploy or change production database before all gates pass.