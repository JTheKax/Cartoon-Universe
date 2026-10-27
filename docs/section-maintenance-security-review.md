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

1. Confirm the SQL proposal matches the actual production schema and existing grants using read-only inspection. Test migrations against a disposable local Supabase environment first; do not create paid branches.
2. Verify the new server-only owner identity resolver and RPC writer together under real disposable Supabase Auth sessions; no owner ID, role, or token may be accepted from the JSON request body.
3. Validate the proposed audited RPC and writer against a real disposable Supabase environment. The new PostgreSQL CI test proves atomic rollback in its fixture, but the integration is not yet connected to a gateway.
4. Mount read and write routes only in an isolated gateway and verify every protected page, asset, and mutation. A status banner alone is not access control.
5. Test owner, player, anonymous, expired-token, global-maintenance, partial-outage, concurrent-update, and rollback paths end-to-end; check all GitHub Actions jobs before release.
6. Obtain separate release authorization before any production migration, merge, deployment, or maintenance-mode change.
