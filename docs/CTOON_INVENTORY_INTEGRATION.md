# CToon per-player inventory integration (review only)

This branch introduces a pure read-only projection for individual CToon ownership. It is NOT a grant or transaction API and must not be used as authorization.

- Catalog rows: `{id, name, series, category}` with stable unique CToon IDs.
- Authorized inventory rows: `{ctoon_id, quantity}` retrieved on the server or through authenticated Supabase queries protected by row-level security.
- Display Owned / Need, quantity, duplicate count, series and category filters.
- Unknown ownership must show **Unavailable**, never infer that a signed-out visitor owns nothing.
- Next: connect this model to the actual published CToon catalog, add authenticated per-player fetch, and verify RLS against cross-account reads.
- No production DB changes, minting, purchases, merges, or deployments in this review branch.

Run: `node --test tests/ctoon-inventory-core.test.mjs`
