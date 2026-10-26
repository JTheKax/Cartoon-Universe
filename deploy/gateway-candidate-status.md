# Allocated gateway address — setup phase

The user selected a new Render address. A separate free web service now serves only an isolated setup page. It is not the active arcade and does not run the production gate.

| Item | Verified value |
| --- | --- |
| Candidate URL | https://cartoon-universe-gateway.onrender.com |
| Current arcade, unchanged | https://cartoon-universe-3.onrender.com |
| Candidate service | `cartoon-universe-gateway` / `srv-dbf20i7avr4c73chisug` |
| Workspace / region / plan | Cartoon Universe / Oregon / free |
| Source branch | Existing `maintenance-secure-controls` draft branch |
| Current deployed commit | `257597d275beb4860fc9cfe2d95f9ab8bd347ad6` |
| Current verified live deploy | `dep-dbf28hvb9u1s73bc8ke0` |
| Build / start | `node --check server/gateway-candidate.mjs` / `node server/gateway-candidate.mjs` |
| Auto-deploy | OFF |
| Runtime configuration supplied | Node 22; candidate mode true; production gateway enabled false; candidate origin set to the allocated HTTPS URL |
| Supabase credentials supplied | None |

## HTTP verification

Requests were made over HTTPS after Render reported the specific deploy live:

| URL path / origin | Expected and observed response |
| --- | --- |
| Candidate `/__maintenance/health` | HTTP 200, `Gateway candidate setup running` |
| Candidate `/` | HTTP 503, setup page with a link to the current arcade |
| Candidate `/config.js` | HTTP 503, same setup page; no client configuration or key is exposed |
| Existing arcade `/` | HTTP 200, existing Cartoon Universe page |

Candidate responses use `Cache-Control: no-store`. The setup server has no Supabase client, database connection, password form, or application write endpoint. Its later diagnostic cookie endpoints change only short-lived in-memory probe state. Render currently uses its default TCP health probe; the HTTP health path was independently checked but was not configured through the limited create-service tool.

Production `site_maintenance.enabled` was independently read as false. Production accounts, coins, profiles, grants, policies, Auth project settings, redirects, DNS, and maintenance settings were not changed. The later, narrowly scoped login-origin function update is documented below. No new Supabase project or Git branch was created. PR #51 remains draft and unmerged.

## Prepared artifacts

`deploy/cutover-candidate/` is the generated redirect-only review bundle for the actual target URL. It contains a minimal `public` directory with no application HTML/scripts/artwork, root/wildcard route proposals, and the verification manifest. It has not been published or applied.

`deploy/render-gateway.review.yaml` now names this allocated service and canonical URL, but remains an unapplied production-promotion proposal. Its start command, source branch, and candidate-mode setting intentionally differ from the current isolated setup phase. Direct Render configuration is the current source of truth. Do not sync the review file until that transition has been reconciled and approved within the ongoing cutover work.

The next release work is to verify hosted Auth/origin/cookie behavior and database enforcement, then promote the candidate and replace the old static publication with reviewed redirects. Allocating this address does not itself complete site-wide maintenance protection.

## Hosted cookie and username-origin verification

The candidate was updated at commit `257597d275beb4860fc9cfe2d95f9ab8bd347ad6`, live deploy `dep-dbf28hvb9u1s73bc8ke0`. Only the public `CANDIDATE_SITE_ORIGIN` setting was added. Supabase credentials were not added; production gate startup remains disabled.

A real Chromium CI check on the hosted HTTPS address passed cookie issuance, Secure/HttpOnly/SameSite=Strict/host-prefix attributes, browser round-trip, JavaScript invisibility, cross-origin rejection, deletion, and continued denial of owner/application access. The probe cookie has no authority and is not an owner session. Local tests cover its 60-second expiry; the hosted test checks round-trip and deletion rather than waiting for expiry. The hosted test tolerates temporary wake-up/network delays within its bounded readiness window.

The production `username-login` Edge Function was updated from version 3 to version 4 only after regression tests and all four CI jobs passed on the reviewed code. The configured original website origin and the exact allocated gateway origin are allowed; no wildcard or lookalike origin is allowed. Password validation and privileged user-lookup code were compared with the deployed version 3 baseline and remained byte-for-byte unchanged. Existing `verify_jwt=false` was preserved because this endpoint authenticates supplied credentials itself.

Live checks verified both approved origins receive their own exact CORS header: OPTIONS 204 and invalid-input POST 401. An unapproved origin received 403 for both methods and no allow-origin header. The invalid username format made these POST checks stop before database lookup or password authentication. No real account credential, account creation, recovery email, or session mutation was used for these production checks.

The old arcade still returned HTTP 200, and production maintenance was read as OFF after the function update. No database row, grant, policy, wallet, profile, DNS, old-site redirect, or publication setting was changed. The candidate is still a setup-only page, not a live player website. A valid hosted owner sign-in/cookie session and the remaining hosted Auth/recovery and database-policy requirements are not claimed as complete by this diagnostic probe.
