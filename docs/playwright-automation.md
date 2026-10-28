# Free Playwright browser automation (review only)

This workflow runs **read-only smoke tests** against the integrated Cartoon Universe review preview. It never signs in, changes Render settings, toggles maintenance, or deploys production.

## Run
Open **GitHub → Actions → Playwright review checks → Run workflow**, choose the review branch, and optionally supply a Render preview URL. Pull requests that modify this workflow or its tests also trigger checks.

## Cost and access
Playwright is open source. GitHub-hosted Actions minutes are subject to the repository's plan, quotas, and billing policies; avoid claiming unlimited free runs. No TinyFish credits or paid AI browser model are needed.

## Security
Only HTTPS `*.onrender.com` URLs are allowed. Do not put owner passwords, Supabase service-role keys, or production secrets in tests. Browser tests are anonymous and do not change database state.

## Next steps
Add authenticated owner tests only after setting up secure test-only credentials and a disposable isolated environment. Changing Render dashboard settings still requires an authorized browser session or an appropriate Render API integration.
