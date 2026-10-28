# Cartoon Universe 3.0 — Public launch routing gate

This branch is isolated from the live maintenance deployment. Do not change the Render static site's publish directory to `preview-public` or `.`: both would bypass the server-side owner/maintenance access gate.

## Verified current configuration (2026-10-28)
- Public Render static service `srv-dbeg2nu7bikc738b8ulg`: branch `public-maintenance-cutover`, publish path `deploy/public-maintenance`; live maintenance page.
- Gateway `srv-dbf20i7avr4c73chisug`: branch `maintenance-secure-controls`, start command `node server/gateway-candidate.mjs`, candidate mode only. Its `/__maintenance/health` endpoint responds, but the root can return 503 by design.
- Integrated preview `cartoon-universe-integrated-review.onrender.com` exposes a review-only front-end bundle, not a secure public release.

## Launch blockers
1. Review and integrate the distinct production-safe HTTP entry point proposed in draft PR #66 (`server/public-launch-gateway.mjs`), which has isolated mocked security CI. It is **not yet merged or live**; do not confuse its passing CI with production verification.
2. Verify canonical-origin login/logout, owner membership, and maintenance fail-closed behavior **on the deployed separate gateway** with real owner and player accounts. Mocked tests and the old candidate gateway do not satisfy this requirement.
3. Update Render gateway build/start commands and production environment with appropriate publishable (not service-role) Supabase credentials; never copy secrets into GitHub.
4. Coordinate the public hostname's routing to the verified public gateway. Render's static publishPath cannot be changed by the currently connected Render tool; avoid changing it to the review-only bundle.
5. Run integration CI and live anonymous/player/owner access tests, including denied owner routes, Cartoon Coin grants and RLS. Only then turn off maintenance.

## Acceptance criteria
- Anonymous users can see only intended public pages; login/register work.
- Normal signed-in players can access player pages and never owner-only controls.
- Verified owner can access the dashboard and maintenance controls.
- Maintenance on/off states work and fail closed on unavailable configuration.
- No SQL, private files, service-role keys, or repository sources are web-accessible.
- Production public and gateway URLs pass real smoke checks, not only simulated CI.

Do not declare the public launch complete or disable maintenance before these checks pass.

## Automated diagnostic (review branch only)

`node --test tests/check-public-launch.test.mjs` runs offline negative tests. `node scripts/check-public-launch.mjs` makes **read-only** live HTTP requests and intentionally fails while the old candidate gateway is deployed. The diagnostic requires the distinct public gateway's health marker, anonymous owner denial, maintenance-gated public pages, recovery route, and absence of source exposure. Passing it is **not launch approval** and cannot replace real owner/player authentication, browser, Supabase recovery redirect, and RLS tests. Do not run credential-bearing tests on public static previews.
