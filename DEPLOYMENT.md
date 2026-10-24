# Continuous integration and deployment

- GitHub Actions runs syntax and structural checks on every PR targeting `main` and every push to `main`.
- Render Static Site already auto-deploys pushes to `main`.
- **GitHub repository auto-merge is currently disabled**; an administrator must enable it in Settings → General → Pull Requests → Allow auto-merge.
- Configure a ruleset/branch protection for `main`: require PRs, require passing `Validate website` check, prevent force pushes and deletions, and prevent bypasses. Wait for the check to appear after the workflow runs.
- Only enable auto-merge for PRs that are **ready for review**, fully configured, and independently validated. Draft PRs must never auto-merge.
- These checks validate structure and syntax, not end-to-end authentication or production security. Add staging E2E tests and manual acceptance criteria before enabling unattended merges for database/auth changes.
- Keep Phase 2 PR #1 in draft until Supabase is configured and tested. Do not auto-merge it.
- No GitHub token, database secret, or Render API key is committed.
