# Cartoon Universe 3.0

Cartoon Universe is a static, Halloween-themed arcade hub hosted on Render, backed by Supabase for authentication, profiles, owner membership, and Cartoon Coin wallets.

## Available interface
- Responsive homepage, navigation, Explore, Roadmap, About, and four browser-saved themes.
- Registration, login, password recovery, and editable player passport (`login.html`, `register.html`, `auth.js`).
- Cartoon Coin wallet with daily reward and transaction history (`coin-wallet.html`).
- Owner dashboard with access checks and player count (`owner.html`).

## Planned features
Games, card and sticker collections, shops, streaming, and expanded owner controls currently appear as coming-soon placeholders. Do not treat them as deployed functionality.

## Deployment
Render Static Site: build command `echo ready`, publish directory `.`. Supabase client settings are in `config.js`; publishable client keys are not administrative secrets. Enforce all sensitive authorization and currency operations in Supabase RLS, functions, and database policies.

## Safety
Changes should be reviewed through pull requests and checked before merging. Do not reset or overwrite existing player profiles, balances, or transaction history.
