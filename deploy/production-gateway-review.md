# Production gateway candidate — not deployed

This package prepares a production configuration path while preserving the existing staging project safeguard and keeping maintenance activation locked. It is not a completed production cutover.

## Entry points and environment

| Entry point | Behavior |
| --- | --- |
| `node server/maintenance-gateway.mjs` | Existing staging/local mode; continues to reject the production project |
| `node server/production-maintenance-gateway.mjs` | Separate production mode; refuses to start by default |

Production mode requires all of the following:

| Variable | Required value |
| --- | --- |
| `PRODUCTION_GATEWAY_ENABLED` | Exactly `true`; the review Blueprint deliberately sets `false` |
| `PRODUCTION_SUPABASE_URL` | Exactly the known Cartoon Universe HTTPS project URL, with an optional trailing slash |
| `PRODUCTION_SUPABASE_PUBLISHABLE_KEY` | The project's modern publishable key; never a secret/service-role or legacy JWT key |
| `PRODUCTION_SITE_ORIGIN` | The chosen canonical HTTPS website origin, without credentials, path, query, fragment, custom port, IP address, or local/test suffix |
| `PORT` | Render-provided HTTP port; fallback `10000` |

The startup switch enables the server process only. It does not turn maintenance ON, write a database row, run SQL, or unlock the owner dashboard's maintenance button. Do not change this switch as a substitute for completing the routing review.

Production mode shares the tested request gate but uses an opaque `__Host-cu_owner` cookie with `Secure; HttpOnly; SameSite=Strict; Path=/`, no Domain attribute, and a five-minute lifetime. Supabase token and owner-membership checks are repeated for each bypass. The browser bridge displays owner access controls without staging labels in production mode. The old static publication does not load this bridge automatically.

## Render configuration candidate

`deploy/render-gateway.review.yaml` is a review-only, non-root Blueprint file. It is not connected to Render and has not been applied. It now names the directly created `cartoon-universe-gateway` candidate. The file remains an unapplied future promotion proposal; direct Render configuration is the current source of truth. The current `cartoon-universe` static service is separate.

- Auto-deploy is OFF; the server startup switch is false.
- The candidate explicitly uses the free compute plan to avoid silently accepting a paid default. Production uptime/capacity and plan selection must be reviewed before resource creation; this is not a recommendation that the free plan meets production availability needs.
- One instance matches the current in-memory owner-session design.
- The build checks syntax; the runtime uses only Node built-in modules and requires no production npm installation.
- No database resource, disk, pre-deploy migration, custom domain, or old-static redirect rule is declared.
- The canonical origin is now the allocated Render gateway URL. The publishable key remains a manual environment input; no key value is committed.
- `/__maintenance/health` reports process availability. It intentionally remains healthy during maintenance; it does not prove Supabase connectivity or hosted compatibility. Post-deploy workload checks are required before routing traffic.

The candidate was checked against Render's retrieved public JSON Schema at `https://render.com/schema/render.yaml.json`. This verifies structure, not account-specific plan availability, platform-aware validation, resource creation, or successful deployment. The Render CLI was not used to apply or sync anything.

Even with auto-deploy OFF, creating/syncing a new Blueprint would create resources and attempt an initial deployment. With this file unchanged, the process intentionally refuses to start. Do not sync the review file as if it were a ready deployment.

## Cutover inputs still required

The candidate URL is now `https://cartoon-universe-gateway.onrender.com`. It currently serves only an isolated setup page and is not the active arcade. Follow `tests/maintenance-production-routing-review.md` to inventory origins, review Auth/username-login/recovery compatibility, and prepare the old static service's redirect-only publication. Render's existing-file precedence means adding wildcard redirects while retaining the full static publication is insufficient.

Before enabling this production entry point, verify the real project/key pair and canonical origin, confirm hosted HTTPS cookie behavior and owner access, finish database-policy/grant review, and prove that the old origin cannot serve the protected website directly. Keep production maintenance OFF and the owner activation interlock locked throughout preparation. Do not blindly replace the already-guarded production reward function.

## Verification

The production configuration tests cover the default-disabled startup, exact project matching, rejection of privileged keys and insecure/ambiguous origins, preservation of staging isolation, secure production-cookie attributes, and read-only upstream verification. Their upstream transport is a stub; they make no production API request.

The existing HTTP, simulated-browser, and real local Supabase tests continue to exercise the shared gate. These tests do not prove the eventual Render hostname, hosted TLS/routing, or production database policy parity. No deployment, production SQL/grant change, toggle, or merge is included in this package.

## Redirect-only bundle preparation

After the actual canonical gateway origin is chosen, prepare a local review bundle with:

```sh
node scripts/prepare-maintenance-cutover.mjs --target HTTPS_ORIGIN --output EMPTY_DIRECTORY
```

The target must pass the production origin validator and must differ from the old static origin. The output must be absent or empty. Existing files are never overwritten.

The bundle contains `cutover.review.json`, `render-routes.review.json`, a README, and a `public` directory containing only a harmless text marker. There is no index HTML or application code to take precedence over Render redirects. The review manifest records the exact old service/origin, chosen target, root/wildcard rules, protected-path verification list, query/fragment probes, and disabled startup/activation state. It contains no API key, user account, or session.

The generator performs no network call, deployment, SQL, resource creation, or setting update. Its test hostname is only a fixture string, not an allocated service or a suggested live link. Generated rules are review material; existing rules and domain aliases still need inspection before any replacement.

For an eventual cutover, verify the new target first, configure the reviewed redirects while the old website still exists, and only then switch the old static publication to the bundle's `public` subdirectory. Do not publish the whole bundle or retain the original website in the old publication. Test actual hosted redirect status/destination, query strings, browser fragments, Auth links, and every recorded protected path. The generator does not prove Render's live behavior or automatically enable anything.

## Address allocation and current phase

The user selected a new Render address. The candidate was created directly in the existing Cartoon Universe workspace, on the free compute plan, with auto-deploy OFF. It uses the existing draft PR branch and the isolated `server/gateway-candidate.mjs` start command. No new Git branch was created or PR merged. The setup entry point has no Supabase dependency or credential and responds with a setup page (503) plus a process health endpoint (200).

The allocated URL is `https://cartoon-universe-gateway.onrender.com`; the resource is `srv-dbf20i7avr4c73chisug`. `GATEWAY_CANDIDATE_MODE=true` and `PRODUCTION_GATEWAY_ENABLED=false` are set on this candidate. The production gateway has not been enabled. The old arcade remains at `https://cartoon-universe-3.onrender.com`.

`deploy/cutover-candidate/` contains a generated review bundle using the actual target origin. It has not been published or applied. The future promotion Blueprint now uses this service name and origin, with candidate mode false and production startup still disabled. Do not sync it over the live setup phase without reviewing and reconciling the direct configuration. Hosted Auth/cookie compatibility, database-policy/grant work, and old-origin cutover remain separate pending steps.
