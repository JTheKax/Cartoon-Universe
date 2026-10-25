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

`deploy/render-gateway.review.yaml` is a review-only, non-root Blueprint file. It is not connected to Render and has not been applied. It defines a differently named web service, not the current `cartoon-universe` static service.

- Auto-deploy is OFF; the server startup switch is false.
- The candidate explicitly uses the free compute plan to avoid silently accepting a paid default. Production uptime/capacity and plan selection must be reviewed before resource creation; this is not a recommendation that the free plan meets production availability needs.
- One instance matches the current in-memory owner-session design.
- The build checks syntax; the runtime uses only Node built-in modules and requires no production npm installation.
- No database resource, disk, pre-deploy migration, custom domain, or old-static redirect rule is declared.
- Public key and canonical origin are manual environment inputs. No key value is committed.
- `/__maintenance/health` reports process availability. It intentionally remains healthy during maintenance; it does not prove Supabase connectivity or hosted compatibility. Post-deploy workload checks are required before routing traffic.

The candidate was checked against Render's retrieved public JSON Schema at `https://render.com/schema/render.yaml.json`. This verifies structure, not account-specific plan availability, platform-aware validation, resource creation, or successful deployment. The Render CLI was not used to apply or sync anything.

Even with auto-deploy OFF, creating/syncing a new Blueprint would create resources and attempt an initial deployment. With this file unchanged, the process intentionally refuses to start. Do not sync the review file as if it were a ready deployment.

## Cutover inputs still required

The actual canonical gateway URL has not been allocated or chosen. Follow `tests/maintenance-production-routing-review.md` to inventory origins, review Auth/username-login/recovery compatibility, and prepare the old static service's redirect-only publication. Render's existing-file precedence means adding wildcard redirects while retaining the full static publication is insufficient.

Before enabling this production entry point, verify the real project/key pair and canonical origin, confirm hosted HTTPS cookie behavior and owner access, finish database-policy/grant review, and prove that the old origin cannot serve the protected website directly. Keep production maintenance OFF and the owner activation interlock locked throughout preparation. Do not blindly replace the already-guarded production reward function.

## Verification

The production configuration tests cover the default-disabled startup, exact project matching, rejection of privileged keys and insecure/ambiguous origins, preservation of staging isolation, secure production-cookie attributes, and read-only upstream verification. Their upstream transport is a stub; they make no production API request.

The existing HTTP, simulated-browser, and real local Supabase tests continue to exercise the shared gate. These tests do not prove the eventual Render hostname, hosted TLS/routing, or production database policy parity. No deployment, production SQL/grant change, toggle, or merge is included in this package.
