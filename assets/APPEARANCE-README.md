# Adding Cartoon Universe appearance options

This is a **review-branch-only** automatic catalog. No production deploy or merge is performed.

- Add a PNG, JPG, WEBP or SVG logo named `assets/logos/my-new-logo.png`.
- Add a CSS theme named `assets/themes/my-new-theme.css`. A custom theme should style `html[data-background-theme="custom"] body` and other elements as desired.
- Use only letters, numbers, hyphens and underscores in file names; do not use spaces.
- The GitHub Actions workflow `Refresh appearance catalog (review only)` indexes added files and commits `assets/appearance-catalog.json` to the review branch. The workflow needs Actions enabled and permission to push to that branch. If it cannot push, run `python scripts/build_appearance_catalog.py` and commit the JSON file manually.
- New items appear automatically in the owner dashboard Logos and Themes selectors after the catalog refresh and page reload. Existing built-in options remain available.
- Switching choices is **browser-local** and does not publish a site-wide default for players.
- The existing Dragon Energy and Ninja Chakra logo visuals are still placeholders; adding the final illustrated images as files makes them selectable as separate image options.
