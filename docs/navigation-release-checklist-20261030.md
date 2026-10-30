# Navigation release verification — Cartoon Universe 3.0

## Scope
Nine top-level sections: Home, Games, Collect, Shop, Cards, Watch, Community, Account, and Admin. Ctoon collecting is the primary homepage call to action. Unreleased destinations show Coming Soon.

## Code review verified
- Collect routes use section=Collect for Sets Overview, My Collection, My Scene, Encyclopedia, Wishlist.
- Watch is a direct link without a dropdown.
- Admin navigation starts hidden; admin-nav.js uses Supabase authenticated user and owner_members membership to show the menu.
- Unreleased destinations use navigation-destination.html. A Coming Soon destination is not evidence that the actual feature is implemented.

## Required hands-on release checks
1. Desktop and mobile: open/close each dropdown, tap each destination, verify keyboard Escape and outside-click closing.
2. Anonymous player: Admin tab must remain absent. Attempt to load owner.html directly; server/database authorization must deny protected actions.
3. Signed-in regular player: Admin must remain absent, and owner-only RPCs/queries must be denied.
4. Signed-in owner: Admin appears, Dashboard opens, maintenance/coin/theater actions require verified owner permission.
5. Login/logout transitions: refresh the page and verify Admin visibility updates; test expired sessions and Supabase errors.
6. Confirm all Coming Soon routes render safely and no new feature appears live without a working backend.
7. Check accessibility, narrow screens, console errors, broken URLs, and production-equivalent gateway routing.
8. Require all four GitHub CI jobs to pass on the latest commit before any merge/deployment.

## Deployment
Do not merge or deploy solely based on code inspection or simulated identities. Authenticated owner/player verification remains outstanding.
