# Maintenance mode security requirements

The current Cartoon Universe deployment is a Render **static site**. A browser-only toggle, redirect, or Supabase setting cannot prevent users from directly requesting existing HTML and JavaScript URLs. Therefore the Maintenance Center must not claim to enforce downtime until a server/edge gate protects every route.

## Implementation requirements

1. Place the site behind a server-side or edge request gate that intercepts all routes, including direct links and assets requiring protection. Default to serving the site if configuration cannot be read, with explicit operator alerts.
2. Store enabled state and public notice in Supabase; only authenticated owner members may update it. Enforce owner membership in the database or trusted server, never solely in JavaScript. Log each change.
3. Use a trusted, HttpOnly, Secure, SameSite owner session for bypass. Never accept an unverified client-controlled owner flag or expose service-role credentials.
4. Route non-owner requests to `maintenance.html` with HTTP 503 and `Retry-After`; do not redirect in a loop. Allow the notice and necessary public assets.
5. Keep account, wallet, and game mutation endpoints protected independently; a static HTML gate is not an authorization mechanism.
6. Add integration tests for anonymous visitors, regular players, owners, stale sessions, direct URLs, cached pages, and OFF/ON/OFF transitions.
7. Deploy with maintenance OFF; validate both states in staging before enabling production control.

The standalone `maintenance.html` is a visual foundation, **not** active enforcement. The current dashboard remains preview-only until a trusted request gate is deployed.
