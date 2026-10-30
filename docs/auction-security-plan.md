# Sticker Auctions: secure implementation plan

The current preview does not permit listings, bids, transfers or Cartoon Coin deductions.

Proposed tables: sticker_auctions (seller_id, sticker_id, starting_bid, current_bid, ends_at, status, winning_bid_id), sticker_auction_bids (auction_id, bidder_id, bid_amount, created_at), and idempotent settlement ledger.

Before activation:
- Verify seller owns the sticker; reserve exactly one owned copy in escrow atomically at listing creation. Never trust client-submitted ownership.
- Restrict bids to authenticated non-sellers, require bids above current bid, enforce balances and server-controlled minimum increments, and lock auction and wallet rows in transactions.
- Reserve bidder funds or implement consistent balance locking and refund previous high bidder. No client-driven wallet credits.
- Server controls time, expiry, cancellation, winner selection and settlement; use idempotency keys and transaction logs. Safely refund or return unsold escrow.
- Enable RLS with least-privilege grants, owner-only moderation, anti-abuse limits, and tests for concurrent bids, duplicate settlements, negative bids, self-bidding, unauthorized reads/writes and cross-user transfers.
- Validate catalog image URLs and listing content before publishing.
- Perform isolated database and end-to-end tests; production migrations require explicit approval.
