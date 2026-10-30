# Homepage internal promotions — isolated feature specification

Scope: Cartoon Universe announcements only; homepage placement only. No third-party ad network, tracking pixels, external destinations, or player-submitted ads.

## Data model (nonproduction migration proposal)
```sql
create table public.home_promotions (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 100),
 description text not null default '',
 image_path text,
 destination_path text not null check (destination_path ~ '^/[a-zA-Z0-9/_-]*$'),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 enabled boolean not null default false,
 created_at timestamptz not null default now(),
 check (ends_at > starts_at)
);
alter table public.home_promotions enable row level security;
-- Owner policies must use the existing verified owner identity mechanism.
-- No INSERT/UPDATE/DELETE policies for public or authenticated players.
-- Public SELECT must expose only active, in-window records through a
-- separate carefully scoped view or trusted endpoint, not this table.
```

## Security and implementation requirements
- Verify owner authorization server-side for every create, update, upload and delete; hiding an Admin button is not authorization.
- Store uploads in a private or carefully scoped Supabase Storage bucket with owner-only writes. Validate actual MIME bytes, limit file size, disallow SVG/HTML, and use generated object keys.
- Display only active promotions where starts_at <= server time and ends_at > server time.
- Render all text as textContent; never inject HTML. Require same-origin destination paths.
- Label each card 'Cartoon Universe promotion'. Never disguise it as editorial content.
- No external ad scripts, user profiling, third-party cookies, or personalized targeting.
- Limit frequency and layout shift; respect reduced-motion settings.
- Default to disabled; owner must explicitly activate each campaign.
- Restrict display to homepage; never inject on login, account, theater, or other pages.
- Test anonymous read restrictions, unauthorized owner mutations, upload validation, schedule boundaries, and accessibility.
- Do not run this migration against production until separately approved.
