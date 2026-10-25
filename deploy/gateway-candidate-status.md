# Allocated gateway address — setup phase

The user selected a new Render address. A separate free web service now serves only an isolated setup page. It is not the active arcade and does not run the production gate.

| Item | Verified value |
| --- | --- |
| Candidate URL | https://cartoon-universe-gateway.onrender.com |
| Current arcade, unchanged | https://cartoon-universe-3.onrender.com |
| Candidate service | `cartoon-universe-gateway` / `srv-dbf20i7avr4c73chisug` |
| Workspace / region / plan | Cartoon Universe / Oregon / free |
| Source branch | Existing `maintenance-secure-controls` draft branch |
| Deployed commit | `54ed8e0ad51669df776ec909b03fb7e68d104544` |
| Verified live deploy | `dep-dbf20ifavr4c73chito0` |
| Build / start | `node --check server/gateway-candidate.mjs` / `node server/gateway-candidate.mjs` |
| Auto-deploy | OFF |
| Runtime configuration supplied | Node 22; candidate mode true; production gateway enabled false |
| Supabase credentials supplied | None |

## HTTP verification

Requests were made over HTTPS after Render reported the specific deploy live:

| URL path / origin | Expected and observed response |
| --- | --- |
| Candidate `/__maintenance/health` | HTTP 200, `Gateway candidate setup running` |
| Candidate `/` | HTTP 503, setup page with a link to the current arcade |
| Candidate `/config.js` | HTTP 503, same setup page; no client configuration or key is exposed |
| Existing arcade `/` | HTTP 200, existing Cartoon Universe page |

Candidate responses use `Cache-Control: no-store`. The setup server has no Supabase client, database connection, password form, or write endpoint. Render currently uses its default TCP health probe; the HTTP health path was independently checked but was not configured through the limited create-service tool.

Production `site_maintenance.enabled` was independently read as false. No production accounts, coins, profiles, functions, grants, policies, Auth settings, redirects, DNS, or maintenance settings were changed. No new Supabase project or Git branch was created. PR #51 remains draft and unmerged.

## Prepared artifacts

`deploy/cutover-candidate/` is the generated redirect-only review bundle for the actual target URL. It contains a minimal `public` directory with no application HTML/scripts/artwork, root/wildcard route proposals, and the verification manifest. It has not been published or applied.

`deploy/render-gateway.review.yaml` now names this allocated service and canonical URL, but remains an unapplied production-promotion proposal. Its start command, source branch, and candidate-mode setting intentionally differ from the current isolated setup phase. Direct Render configuration is the current source of truth. Do not sync the review file until that transition has been reconciled and approved within the ongoing cutover work.

The next release work is to verify hosted Auth/origin/cookie behavior and database enforcement, then promote the candidate and replace the old static publication with reviewed redirects. Allocating this address does not itself complete site-wide maintenance protection.
