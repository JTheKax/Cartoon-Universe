# Phase 2 — Secure player accounts (staging PR)
Phase 1 homepage is preserved. Phase 2 uses Supabase Auth and a NEW Supabase Postgres project; no legacy data is migrated.

## Setup required before deployment
1. Create a NEW Supabase project at https://supabase.com/dashboard.
2. In SQL Editor, execute `supabase/schema.sql`.
3. Under Authentication → URL Configuration, set the site URL to the Render production domain and add `https://cartoon-universe-3.onrender.com/account.html` to redirect allowlist.
4. Configure SMTP for production authentication emails. Enable email confirmation, review rate limits and anti-abuse settings.
5. Copy `config.example.js` to `config.js` and insert the NEW project URL and PUBLIC anon/publishable key. **Never use the service_role key**. `config.js` is intentionally ignored by Git; for deployment, use a secure build-time injection process or another safe public-config delivery method. The site will show a disabled account UI until configured.
6. Create your owner account via registration. Find its UUID in Supabase Authentication → Users. In SQL Editor, execute `insert into public.owner_members(user_id) values ('YOUR_UUID') on conflict do nothing;`. Never make the first user automatically owner.
7. Test signup, email confirmation, login, password reset, profile editing, logout, RLS and owner status in staging before merging.

## Security notes
- Supabase Auth handles password hashing, sessions and reset tokens; browser never sees database credentials or service_role key.
- Row Level Security restricts profile updates to each authenticated user. Owner grants are server-admin-only via SQL.
- Public profiles expose usernames and display names; avoid putting personal information in those fields.
- Usernames are selected after email verification if email confirmation is enabled. Username conflicts must be resolved by editing profile.
- Future owner-only actions must check `owner_members` on the server or in RLS; hiding buttons is not authorization.
- The existing Render static site must NOT be deployed with unconfigured `config.js`. Review deployment setup first.
