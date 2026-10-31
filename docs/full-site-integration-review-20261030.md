# Cartoon Universe 3.0 — Full-site integration review (2026-10-30)

## Baseline
- Production branch: `public-maintenance-cutover`. Keep the published 90-series video-game catalog and cartoon/anime series intact.
- Integration branch: `review/full-site-integration-20261030`.
- Render production static site: `cartoon-universe-3`, publishing `deploy/public-gateway-cutover`; this publish path must be checked before expecting root-level HTML changes to appear.
- Existing combined review deploy is older than production; **do not merge it wholesale**.

## Observed defects on baseline
- `index.html` still contains older navigation (Collectibles, Packs, My Shop) and haunted/Halloween wording.
- Homepage feature tiles link to anchors instead of distinct pages.
- New navigation source `feature/navigation-reorganization-20261030` diverged from production (11 ahead, 365 behind at inspection).
- Sticker collection source `feature/console-cartoon-anime-game-sets-20261030` diverged (28 ahead, 365 behind). Review its inventory security SQL and tests separately.

## Target navigation
Home: Announcements, New Releases, Coming Soon.
Games: Monster Catcher, Monster Catcher 2, Racing, Fighting, Retro Games, Arcade, Claw Machine, Prize Wheel.
Collect: Sets Overview, My Collection, My Scene, Encyclopedia, Wishlist.
Shop: Sticker Store, Yu-Gi-Oh! Card Shop, Auction, Recycler, Trading.
Cards: Battle, Deck Builder.
Watch: theater page, no dropdown.
Community: Messages, Forums, Support, Help.
Account: Login / Log Out, Register, Profile, Redeem Codes.
Admin (verified owner only): Dashboard, Advertisements, Logos, Themes, Maintenance, Coin Management, Theater Management.

## Safe release gates
1. Inventory every target route and its actual deployed output; no broken links or false “live” labels.
2. Cherry-pick/reimplement desired features on this up-to-date baseline, never replace current catalog blindly.
3. Ensure server-side owner access checks, per-user inventory RLS, coin grant restrictions, and no leaked keys.
4. Run unit/integration tests and GitHub Actions; smoke-test anonymous and authenticated navigation.
5. Build one consolidated **nonproduction** preview with a publish directory containing every linked page and asset.
6. Only after successful verification merge/deploy and retest homepage, Sets Overview, theater and login.

This document records integration scope; it does not claim features have been merged or deployed.
