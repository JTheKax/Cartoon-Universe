# Cartoon Universe automatic release policy

Completed updates should ship individually after required checks pass. Never merge draft PRs or bypass failing checks.

## Required repository configuration (GitHub Settings)
- Protect `main` with a ruleset: require pull requests, require passing status checks from `Validate Cartoon Universe` and `Isolated gateway integration checks` where applicable, require branches to be up to date, prevent force pushes and bypass.
- Enable GitHub repository **Allow auto-merge**.
- For each completed, reviewed, non-draft PR, enable GitHub's native **Auto-merge**. This waits for required checks; do not enable on unfinished PRs.
- Keep unfinished features behind feature flags or maintenance gates; enforce permissions server-side.

## Required hosting configuration (Render)
- Production Render service must deploy from the intended release branch (`main`) and have auto-deploy **after CI checks pass** if supported. Currently the public service deploys from `public-maintenance-cutover` and publishes `deploy/public-maintenance`; this must be deliberately migrated with a tested public-homepage build and rollback plan. Changing only the branch would not make the new homepage public.
- Preserve the current maintenance gateway and owner protections during cutover. Do not treat hiding UI as access control.
- Verify the exact public URL, DNS, static publish directory, routing, and rollback deployment before enabling public theme.
- Test production with anonymous and owner sessions after cutover.

## Release gate
1. Implement on feature branch and open PR.
2. Complete mobile, accessibility, authentication, and anonymous owner-access tests.
3. Require all CI checks green.
4. Mark PR ready and enable auto-merge only after review.
5. Render deploys merged main after checks, with rollback available.

This file documents settings to apply; it does not itself enable branch protection, auto-merge, or Render deployment.
