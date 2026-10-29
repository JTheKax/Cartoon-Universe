# Monster Catcher Online — implementation plan

Status: isolated development; not deployed. Base: feature/monster-catcher-gba-prototype.

## Game contract
- 155 original monster species, numbered 001–155. Evolution forms count as species when assigned separate encyclopedia numbers.
- Persistent owned monster instances (unique instance IDs, species ID, owner ID, stats, moves, trade eligibility).
- Existing Cartoon Universe authentication required for online play. No guest inventory mutations.
- Pixel RPG map with room/zone membership, movement snapshots and nearby-player presence.
- No player-supplied battle wins, monster grants, or trade transfers accepted as authoritative.

## Milestone 1: online foundation
1. Inspect prototype map, navigation, account integration, and current Supabase schema.
2. Add server-authoritative multiplayer room presence with authenticated session validation, rate-limited movement, bounded coordinates, and disconnect expiry.
3. Render other players' avatars and names, with safe display-name escaping and privacy controls.
4. Support reconnect and graceful offline/single-player fallback.
5. Test two simultaneous sessions, unauthorized connections, spoofed user IDs, and rapid movement.

## Milestone 2: collection and encounters
- Versioned species catalog with IDs 001–155 and server-side capture odds.
- Transactional capture and collection writes; unique monster instance IDs.
- Inventory pagination, encyclopedia caught/seen states, team limit 6.
- Keep the custom apple monster as an original species.

## Milestone 3: battles
- Challenge/accept/decline flow and turn-based match state machine.
- Server validates ownership, party size, turn order, move PP, damage, and match results.
- Timeouts, disconnect handling, replayable event log, and abuse throttles.

## Milestone 4: trading
- Authenticated trade session with explicit two-party offer and final confirmation.
- Atomic database transfer after rechecking ownership and eligibility under locks.
- Reject stale offers, duplicate instance IDs, concurrent trades, and cancellation races.
- Audit every completed trade and provide recovery diagnostics.

## Milestone 5: larger shared world
- Towns, routes, forests, caves, world transitions, lobby discovery, and events.
- Performance budgets and room population caps sized for free-tier hosting.

## Delivery and safety
- Use an isolated branch and review PR; do not merge or deploy automatically.
- Do not change production Supabase tables, RLS, or Render settings during prototype work.
- Keep multiplayer opt-in until authentication, RLS, battle/trade concurrency tests and CI pass.
- No copyrighted Pokémon assets, names, music, or character designs.
