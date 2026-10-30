# Section maintenance security review

This is a design checklist only. It does not change production behavior.

- Default every section to unavailable when status is missing or invalid.
- A global maintenance setting overrides per-section availability.
- Only freshly verified owners may request changes through a server-side endpoint.
- Never grant client-side direct writes to section status.
- Require same-origin checks, request validation, and an audit record for each change.
- Protect page access, assets, and state-changing operations; hiding a UI element is not sufficient.
- Test anonymous, player, owner, expired-session, and concurrent-change cases in an isolated environment.
- Verify rollback before enabling owner controls.

Keep the current owner switch disabled until the implementation and tests pass.

## Isolated implementation inventory (2026-10-27)

- `supabase/section-maintenance-review.sql` proposes ten fail-closed section records, a read-only public status table, an owner-only authenticated RPC, and a private audit table. **Not applied to production.**
- `sql/tests/section_maintenance_rpc_test.sql` runs in a disposable PostgreSQL CI database and checks owner/nonowner privileges, invalid input, audit creation, and rollback if audit insertion fails.
- `server/section-maintenance-supabase-reader.mjs` reads global and section states using a publishable key only. The read API defaults to maintenance when the source fails.
- The section API, route guard, transaction contract, Supabase reader/writer, and read API remain isolated modules. They are **not mounted on the production gateway** and the owner's section toggles must remain disabled.
- `server/owner-verification.mjs` exposes a server-only `identity(req)` resolver that rechecks owner membership and supplies the session token only to trusted server code. The isolated RPC writer uses that token, not a service-role key.

## Release blockers

1. Read-only production catalog inspection on 2026-10-27 confirmed `site_maintenance.enabled` is boolean, `owner_members.user_id` is UUID, and neither new section table exists yet; the existing maintenance and membership SELECT/UPDATE policies are present. **No production rows or settings were changed.** Recheck grants and test migrations against disposable local Supabase before any release; do not create paid branches.
2. Verify the new server-only owner identity resolver and RPC writer together under real disposable Supabase Auth sessions; no owner ID, role, or token may be accepted from the JSON request body.
3. Validate the proposed audited RPC and writer against a real disposable Supabase environment. The new PostgreSQL CI test proves atomic rollback in its fixture, but the integration is not yet connected to a gateway.
4. Mount read and write routes only in an isolated gateway and verify every protected page, asset, and mutation. A status banner alone is not access control.
5. Test owner, player, anonymous, expired-token, global-maintenance, partial-outage, concurrent-update, and rollback paths end-to-end; check all GitHub Actions jobs before release.
6. Obtain separate release authorization before any production migration, merge, deployment, or maintenance-mode change.

## Route coverage and HTTP integration review (2026-10-28)

- `server/section-route-guard.mjs` now explicitly classifies the existing Cartoon Universe page paths (including Watch, Shop, Games, account and owner pages) and a **proposed** set of future mutation endpoints. Unknown paths, methods, and malformed URLs fail closed. These mappings do **not** create new application endpoints.
- `server/section-maintenance-review-gateway.mjs` composes the isolated section writer, trusted owner verification, fresh status snapshots and route guard with **injected test handlers only**. It is not an application entry point, does not serve production assets, and does not perform real game or coin mutations.
- `tests/section-maintenance-review-gateway.test.mjs` exercises real loopback HTTP requests for global and per-section page/mutation blocks, owner bypass, malformed/unavailable snapshots, owner-only audited writes, and cross-origin denial. It uses simulated identities and in-memory responses; passing it is **not** proof of production Supabase Auth integration.
- Remaining: mount these controls in an isolated full-feature gateway with all real asset/page/mutation routes; independently verify real disposable Supabase Auth sessions, RLS and audit transactions; verify no bypass through alternative hosts/static hosting; run complete isolated end-to-end tests before proposing release.

## 2026-10-30 review: consistent global + section snapshot (not deployed)

- The prior reader issued two independent PostgREST requests, allowing a global/section status race. The review-only SQL now adds `get_maintenance_snapshot()`, a `STABLE SECURITY INVOKER` read function that obtains global and all ten section states within **one PostgreSQL statement snapshot**. It has public read-only execute grants and does not bypass RLS.
- The isolated reader now uses one GET RPC request, rejects missing/duplicate/nonboolean section states and invalid global states, and fails closed on network or PostgREST errors. Tests exercise the one-request contract, corrupt data, anonymous RPC visibility and an audited owner change in disposable local Supabase.
- This **does not** protect real gateway assets or mutation endpoints until the reader and policy are mounted in the actual gateway. The new RPC has not been installed in production; the old global UPDATE remains unaudited. Keep per-page owner controls disabled.
- Release gate: all CI checks on the latest commit must pass, then separately verify real gateway integration, global audited write, owner recovery, alternate hosts and independently reviewed launch acceptance. No merge/deploy or production database changes without authorization.

## 2026-10-30 review: proposed atomic global maintenance writes

- Added `supabase/global-maintenance-audit-review.sql` as an **unapplied review migration**. It revokes direct authenticated global maintenance UPDATE, provides a server-verified owner-only `set_global_maintenance` RPC, and inserts a global audit record in the same transaction as every status/message change. Failed audit writes must roll back the global status.
- Added disposable PostgreSQL permission, validation and forced-audit-failure assertions and real disposable Supabase Auth/PostgREST owner/nonowner/rollback checks. This is not yet connected to the owner UI or the real gateway. Do not enable the global buttons or apply the migration to production.
- The global RPC intentionally uses `SECURITY DEFINER` with a fixed empty search path and explicit owner membership verification. It is callable by authenticated users but rejects nonowners; independent privilege review remains required before release.
