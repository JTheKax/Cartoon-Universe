# My Scene secure collection integration plan

Status: review-only; do not run against production until ownership, RLS and schema are reviewed.

## Current findings (2026-10-29)
The connected Cartoon Universe Supabase project has no public sticker catalog, player sticker ownership, or scene-save tables. The existing Collect controller contains an empty local registry. It would be unsafe to treat arbitrary image uploads as verified owned stickers.

## Proposed schema
- sticker_catalog: id UUID PK, series, title, image_url (owner-curated), active.
- player_stickers: user_id UUID FK auth.users, sticker_id UUID FK sticker_catalog, quantity positive integer; composite PK (user_id, sticker_id).
- player_scenes: user_id UUID FK auth.users, id UUID PK, title, background key, updated_at.
- player_scene_items: scene_id FK player_scenes, sticker_id FK sticker_catalog, position_x, position_y, size, layer_order. Server-side validation must ensure a player owns each placed sticker.

## Security requirements
- Enable RLS on all tables.
- Authenticated players may read their own player_stickers and scenes only; never allow clients to mint ownership.
- Catalog is read-only for regular players; owner-only writes require server-enforced authorization.
- Scene item writes must verify scene ownership AND sticker ownership in the database (not merely in JavaScript).
- Protect scene size, item counts, image URLs, coordinates and payload sizes.
- Revoke anon writes; audit GRANT permissions, RLS policies, and any security-definer functions.
- Add isolated integration tests for cross-account reads/writes, counterfeit sticker IDs, duplicate grants, revoked ownership, and anonymous users.
- Once secure tables exist, replace the placeholder picker in my-scene-collection.js with an authenticated ownership query and replace browser-only saves with server-side persistence.

No production database modifications were performed as part of this draft.
