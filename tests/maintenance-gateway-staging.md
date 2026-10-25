# Staging maintenance request gate

This is a staging-only Node HTTP server, not a production hosting change. Start it with Node 22 or newer:

```sh
node server/maintenance-gateway.mjs
```

Set these variables in the staging service environment:

| Variable | Required value |
| --- | --- |
| `STAGING_SUPABASE_URL` | HTTPS URL of a separate disposable Supabase project |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | That project's `sb_publishable_` key; never a service-role/secret key |
| `STAGING_SITE_ORIGIN` | Exact HTTPS preview origin, or `http://127.0.0.1:10000` for local use |
| `PORT` | HTTP port, default `10000` |

The entry point refuses the production Cartoon Universe project. It generates `/config.js` exclusively from staging environment values; it never serves the production configuration file. It binds to `0.0.0.0`. `/__maintenance/health` checks only that the process is running, not Supabase readiness. No build command, Render resource, production DNS, or deployment configuration has been changed.

## Access behavior

- Every protected GET/HEAD request reads the maintenance flag, unless the request has a freshly verified owner session. ON, missing/invalid state, or an upstream failure returns HTTP 503 and `Retry-After: 60` for nonowners. OFF serves the selected published file.
- `/login.html`, its essential CSS/auth scripts, generated configuration, and the staging session bridge remain reachable for owner sign-in. Login backgrounds remain protected; the login form still works without them. The staging response removes the old advisory overlay that would hide the login form.
- The bridge forwards the current access token only to the same-origin session endpoint. The server validates the token through Supabase Auth, then checks the matching `owner_members` row with the user's token. Browser claims, URL parameters, user metadata, and fabricated cookies do not grant access.
- The server issues an opaque random HttpOnly, SameSite=Strict cookie, with Secure on HTTPS. Access tokens stay in server memory for at most five minutes; refresh tokens and passwords are never sent to the gateway. Existing browser Supabase authentication remains responsible for the player/owner UI.
- Every owner bypass revalidates Auth and membership. Expired sessions, removed membership, or failed verification cannot bypass the gate. Login-page logout deletes the server-side gateway session. Supabase access-token revocation timing still follows Supabase Auth semantics; this does not implement a privileged `auth.sessions` lookup.
- All responses use `Cache-Control: no-store`. The server exposes only an explicit list of website files, never the SQL, tests, server source, or repository metadata. Encoded/traversal paths are rejected before filesystem access; real paths must remain within the website root.
- In-memory owner sessions disappear on restart and are not shared across instances. Owners must revisit login after expiry/restart. This prototype is intended for one staging instance; production session distribution, rate limiting, session revocation requirements, and browser E2E must be reviewed before promotion.

## Verification and release boundary

`node --test tests/maintenance-gateway.test.mjs` makes real HTTP requests to the server with an injected fake Supabase transport. It checks gate ON/OFF, direct scripts/artwork, HEAD, owner login reachability, fresh owner verification, forged/expired cookies, logout, same-origin session writes, failures, safe message rendering, and internal-file/path rejection. It makes no requests to production or to a real Supabase project.

Still required before release:

1. Provision a separate staging Supabase project, schema, disposable owner and player accounts. Do not copy production accounts, sessions, wallets, or player data.
2. Apply the reviewed reward/profile guards only there and inventory all other privileged mutations/triggers. The gateway does not intercept direct Supabase API calls.
3. Run browser tests for owner login, cookie issuance, protected navigation, logout, recovery, maintenance ON/OFF, and owner dashboard access against staging. The fixture tests do not prove this integration.
4. Verify database mutation guards and browser gateway behavior together. This gate deliberately does not expose a maintenance toggle endpoint; PR #51's ON/OFF button remains locked.
5. Review the eventual production routing plan. A separately deployed gateway does not protect the existing Render static URL, public authentication dependencies, cached/downloaded content, or direct Supabase endpoints. Do not claim complete site-wide protection until every relevant production origin and mutation is covered.

PR #51 stays draft. Production maintenance remains OFF. No production SQL, hosting change, or merge is authorized by running these local tests.

## Local browser coverage without a staging project

`tests/browser` contains a pinned Playwright dependency and lockfile. Run `npm ci --ignore-scripts`, `npx --no-install playwright install chromium`, and `npm test` from that directory. The separate GitHub browser job also installs required system libraries.

This suite drives Chromium through the actual login form, staging bridge, gateway cookie flow, and owner dashboard. It checks owner navigation, player denial, logout, cookie expiry, maintenance OFF, and an upstream outage. Browser identity calls and server Supabase responses are simulated; all other external browser requests are blocked. It creates no accounts, projects, or hosting resources. Passing it does not satisfy the separate real-Supabase staging release requirement.

## Real Supabase integration without a hosted staging project

The `Test real local Supabase integration` CI job starts temporary Supabase Auth, PostgREST, Kong, and PostgreSQL containers on the GitHub runner, bound to loopback. It uses Supabase CLI 2.122.0 in a fresh unlinked temporary directory; it never logs in, links to a cloud project, pulls production data, or uses cloud credentials. The CLI generates a local migration from the repository's initial profile schema, disposable wallet fixture, and the proposed reward/profile guards.

The test creates confirmed disposable owner/player accounts through the local Auth admin API, signs in against real Auth, tests real PostgREST/RLS reward and profile behavior, and drives Chromium through login, dashboard navigation, logout, player denial, and maintenance OFF recovery. The browser receives a pinned bundled Supabase client, and may contact only the local gateway and local Supabase API. Generated credentials stay in memory and are redacted from errors. Local containers and volumes are removed afterward.

Local access requires `STAGING_LOCAL_CONTAINERS=true` and exactly `http://127.0.0.1:54321`. Only this explicit mode permits a legacy local anon JWT if the CLI does not supply a modern publishable key; service-role/secret keys remain forbidden in browser configuration. Production URLs remain blocked even with local mode enabled.

This test uses real Supabase services but a disposable public schema fixture, and is not proof of production schema, hosted TLS/routing, username-login Edge Function, signup trigger, email recovery, or immediate session revocation parity. Production release still requires those specific reviews. No hosted staging project is created.
