# Cartoon Universe public-release candidate (review only)

Target public URL: https://cartoon-universe-3.onrender.com
Owner gateway: https://cartoon-universe-gateway.onrender.com

## Safety interlocks
- This branch is NOT the Render public site's deployment branch (`public-maintenance-cutover`).
- Do not switch the public site's branch or publish path, enable new redirects, merge a release PR, or deploy without separate explicit approval.
- Keep the maintenance-only publication available as the rollback target.
- Do not create billable Supabase branches or modify production data.
- Do not publish the entire repository root before inventorying potentially exposed SQL, config, and server files.

## Build requirements
1. Create a dedicated allowlisted static publication directory containing only the arcade's required HTML, CSS, browser JS, and safe static assets. Exclude SQL, test fixtures, server code, secrets, internal documentation, and development configuration.
2. Verify every relative asset and navigation link resolves from the chosen root URL. Confirm Supabase browser configuration contains only a public/publishable key.
3. Validate regular player registration, sign-in, account recovery, logout, and protected owner-only UI. The owner gateway remains separate.
4. Verify Cartoon Coin balances, duplicate daily-claim prevention, maintenance-mode restrictions, and RLS without writing to production during preparation.
5. Test an authenticated non-owner against the protected gateway (pending: no test account available); automated simulated-identity checks are not a substitute for a live test.
6. Run isolated CI and browser smoke tests on the release artifact. Verify root, login, register, account, wallet, owner, missing pages, and static assets.
7. Record an explicit rollout and rollback procedure. A release requires separate authorization and post-deploy verification.

## Current evidence
- PR #51 was merged to main.
- Existing public maintenance deployment and owner gateway were verified live.
- Owner sign-in works; unauthenticated arcade access returns "Owner verification required".
- Five CI jobs passed on PR #51's tested head.
- Six public legacy URLs returned maintenance.
- Supabase Free-plan leaked-password protection limitation remains accepted and documented.

Status: PLANNING ONLY. No public release artifact has been built, tested, or deployed by this document.
