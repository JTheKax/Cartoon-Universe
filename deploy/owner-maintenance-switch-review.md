# Owner maintenance switch — integration design (no live changes)

## Current behavior
- `owner.html` contains a Maintenance Center with a permanently disabled ON/OFF button.
- `maintenance-controls.js` can read `site_maintenance.enabled` and save the message after owner membership verification, but does not change the enabled flag.
- The public Render static site deploys the `public-maintenance-cutover` branch and publishes `deploy/public-maintenance`, so changing the Supabase flag alone CANNOT open or close the public website.
- The separate gateway serves a verified-owner arcade. Its session checks must remain intact.

## Required implementation before enabling the button
1. Choose and implement an authoritative public-site routing layer that can serve either a reviewed player release artifact or the maintenance page on the SAME public origin. Do not use a browser-only redirect or Supabase boolean alone as enforcement.
2. Add a server-side authenticated maintenance-control endpoint. Verify the owner's session against Supabase Auth and `owner_members` for EACH write; reject regular players, anonymous sessions, missing/expired sessions, cross-origin writes, and stale state. No Render API key or service-role secret may enter browser code.
3. Keep the public router's effective maintenance state distinct from the Supabase dashboard preference. Never display OFF until the actual public routing state is confirmed.
4. Apply fail-closed behavior: unavailable control plane, inconsistent state, or unapproved release => public maintenance remains ON.
5. Gate OFF on an explicit approved release artifact and passing tests. Preserve one-click safe rollback to the maintenance-only artifact; prevent double-submit and log changes without secrets.
6. Add automated tests: owner ON/OFF, signed-in non-owner denial, anonymous denial, CSRF, stale requests, invalid release, routing consistency, rollback, and outage fallback.
7. Run the release candidate's isolated packaging/CI and browser checks. Verify public root, registration, login, wallet, recovery, and owner gateway independently.
8. Only after review and explicit separate launch authorization: configure production routing and enable the switch.

## Status
Design only. No endpoint, control-plane credential, deployment change, or working ON/OFF switch has been implemented. Do not enable the disabled dashboard button until the requirements above are met.

## Per-page maintenance and player-facing status (approved design scope)
- Owner Maintenance Center will support a master maintenance override and individually controlled page/feature entries (e.g., home, arcade, shop, profiles, leaderboards). Define a stable route/feature registry rather than trusting arbitrary browser-provided paths.
- Each public navigation tab displays a plain-language LIVE or MAINTENANCE indicator; add a separate public feature-status page listing the same entries, explanatory notices, and last-confirmed state.
- Status must reflect **effective server-enforced access**, including the master override, not just an owner preference in Supabase. An unverified or stale status must display an unavailable/unknown state, never falsely LIVE.
- Keep status reads public and strictly read-only; redact owner identities, session data, unreleased routes, and internal infrastructure details. Do not expose private features in the public status registry.
- Individual maintenance must block direct URL access server-side, while verified owners may preview safely. Default to maintenance when routing/control-plane health is uncertain.
- Publish status changes atomically with routing changes or only after routing confirms the effective state. Include cache invalidation/versioning so tabs and the status page agree.
- Add isolated tests for per-route direct access, owner bypass, master override, tab/status consistency, invalid routes, outage fail-closed, and stale cache handling.
- This is design scope only. No status badges, status page, route toggles, or production changes are live yet.
