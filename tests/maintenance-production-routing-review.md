# Production routing and compatibility review

Review date: 2026-10-25. Read-only inspection; no deployment, database mutation, toggle, or merge.

## Verified current service

| Item | Observed value |
| --- | --- |
| Canonical Render URL returned by connector | `https://cartoon-universe-3.onrender.com` |
| Workspace | Cartoon Universe (`tea-dbdoep4s728c73clhp60`) |
| Service | `cartoon-universe` (`srv-dbeg2nu7bikc738b8ulg`) |
| Type | `static_site` |
| Repository / branch | `JTheKax/Cartoon-Universe` / `main` |
| Build / publish directory | `echo ready` / `.` |
| Auto-deploy trigger | Commit |
| PR previews | Off |
| Current live deploy | `dep-dbev2cuk1f9s73fmnbu0` |
| Live commit | `92f21719b53aa7739770c0ce1a5dcf63c2a0993d` (Maintenance Center preview, PR #48) |
| Public HTTP check | HTTP 200; title `Cartoon Universe 3.0 | Cartoon Arcade` |

The available service response did not enumerate custom domains or all redirect rules. This review does not claim that every possible alias was inventoried. It identifies the active Render URL; older similarly named URLs must not be assumed to be this service.

## Routing conclusion

The current static service cannot run `server/maintenance-gateway.mjs`. Render does not support changing an existing service's type between static site and web service ([service-type restriction](https://render.com/changelog/change-your-services-backing-repo-or-image-in-the-render-dashboard)). A separate web service or an independently controlled request gateway is needed.

A separately deployed server does not protect the existing static origin. Render serves a file at its existing path before considering redirect/rewrite rules ([matching precedence](https://render.com/docs/redirects-rewrites)). Adding a wildcard redirect while continuing to publish the full website would leave direct HTML, JavaScript, and artwork URLs accessible.

The production URL/routing decision must therefore be explicit. A reviewable candidate is a new web service as the canonical website, with the old static service reduced to a redirect-only publication after verification. This is a plan, not an applied configuration. The new web-service URL has not been allocated, and no custom-domain ownership is assumed.

## Compatibility findings

| Surface | Verified observation | Required action before production activation |
| --- | --- | --- |
| Daily reward RPC | The deployed zero-argument function already contains a maintenance guard; authenticated EXECUTE only, empty search path | Do not blindly replace it. A read-only source comparison confirmed its remaining reward body matches `sql/cartoon_coin_daily_reward.sql` after removing the observed guard and normalizing whitespace |
| Profile shape | Live `profiles` includes `presence_mode text NOT NULL DEFAULT 'offline'` alongside the initial profile columns | Preserve this column; the real local integration fixture includes it |
| Profile and owner grants | Broad client-role grants were observed previously; the proposed minimum-grant cleanup passes isolated tests | Review and apply the cleanup separately from routing; no grant was changed during this review |
| Signup wallet trigger | AFTER INSERT on `auth.users`; inserts a missing wallet with its default balance and returns NEW | Preserve it. The existing local integration test does not exercise this production signup trigger |
| `username-login` | Active version 3, `verify_jwt=false`; deployed source matches the repository implementation inspected here | It accepts a single exact Origin from `SITE_ORIGIN`, defaulting to the current Render URL. A new canonical origin needs compatible CORS/configuration and a username-login test |
| Email/password login | Real local Auth/browser test passed | Validate HTTPS hosted origin behavior and the actual public key/project pair before any traffic cutover |
| Recovery / confirmation | Browser redirects are constructed from `location.origin` | Review Supabase Auth site URL/redirect allowlist for the chosen origin; test recovery/confirmation links, including old links and URL fragments. Auth settings were not changed or fully enumerated here |
| Existing browser sessions | The current application persists Supabase sessions in browser storage | A different website origin has separate browser storage; expect reauthentication. Do not copy player sessions between origins |
| Gateway environment | Current entry point intentionally refuses the production project | Implement and review an explicit production configuration path before attempting a production start; do not remove the project safeguard casually |
| Owner gateway sessions | Opaque HttpOnly cookie, five-minute in-memory session, per-request Auth/membership validation | Start with one instance or implement shared sessions. Restarts expire owner gateway sessions; this does not alter player data |
| Cached and already downloaded content | Static files and previously open pages can already exist on clients | A gateway cannot retract downloaded content. Server-side database/API guards remain necessary |

No production credentials or player rows were read into this report. Function definitions, grants, schema metadata, service metadata, and public HTTP responses were inspected.

## Proposed cutover sequence (not executed)

1. Choose the canonical HTTPS origin and inventory every domain/origin that currently serves the website. Record the exact old/new URLs. Do not assume the old Render hostname can be reassigned to a web service.
2. Prepare a production-capable configuration variant with explicit project/origin validation, a Secure cookie, an explicit file publication list, and the established maintenance interlock. Keep production maintenance OFF throughout preparation.
3. Preserve the existing Supabase project, accounts, coins, inventory, progress, and signup wallet trigger. Compare actual deployed SQL before deciding whether any reward replacement is necessary. Review profile guards and minimum table grants as separate changes.
4. Review hosted Auth redirect settings and `username-login` Origin handling for the chosen website origin. Test existing and new recovery/confirmation URLs without copying sessions or sending test messages to real players.
5. Create the candidate web service only when its concrete configuration is reviewed. Use Node 22+, bind to `0.0.0.0`/`PORT`, and use a dedicated fast health endpoint. Never use a player route that intentionally returns maintenance 503 as the Render health-check path.
6. Verify the candidate's HTTPS behavior, fresh owner sign-in/logout, player navigation with maintenance OFF, API guards, cookies, and file-denial rules. A running process or a successful deploy request alone is not success. Render must report the specific deploy live, followed by workload checks ([deploys](https://render.com/docs/deploys), [health checks](https://render.com/docs/health-checks)).
7. Configure the old static service to publish only a reviewed redirect-only output; remove original protected resources from that publication. Test `/`, `/index.html`, `/owner.html`, `/coin-wallet.html`, scripts, artwork, query strings, and existing Auth links. Every protected old-origin path must stop serving the original website directly.
8. Verify the entire origin inventory and the server-side mutation inventory together. Keep activation locked until both are complete. Do not infer protection from the overlay, a wildcard rule, or one successful owner login.

## Rollback boundary

Keep a record of the current static build and URL before any routing change. A hosting rollback does not undo SQL, grants, Auth settings, or account changes. Restoring the original public static website while maintenance is ON would restore an access bypass. If routing must return to the old website, production maintenance must be OFF and server-side mutation protections must remain consistent; no account or wallet reset is part of rollback.

The current service auto-deploys commits to main, so merging this unfinished draft would also be a production publishing action. PR #51 remains draft and unmerged. The last implementation commit (`ed125bff4682660560794322f189c4504ca87c2d`) passed all four CI jobs, including real disposable local Supabase/browser integration. This review introduces documentation only; it does not establish hosted cutover readiness.
