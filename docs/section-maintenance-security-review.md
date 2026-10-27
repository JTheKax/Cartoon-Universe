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
