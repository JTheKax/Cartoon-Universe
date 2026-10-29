create table if not exists public.theater_dvd_library (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(trim(title)) between 1 and 100),
 youtube_id text not null unique check (youtube_id ~ '^[A-Za-z0-9_-]{11}
 category text not null default 'movies' check (category in ('cartoons-animes','movies','wrestling')),
 created_at timestamptz not null default now()
);
alter table public.theater_dvd_library enable row level security;
revoke all on public.theater_dvd_library from public, anon, authenticated;
grant select on public.theater_dvd_library to anon, authenticated;
grant insert, delete on public.theater_dvd_library to authenticated;
create policy "Public DVD listing" on public.theater_dvd_library for select to anon, authenticated using (true);
create policy "Owner DVD insert" on public.theater_dvd_library for insert to authenticated with check (exists(select 1 from public.owner_members where user_id=auth.uid()));
create policy "Owner DVD delete" on public.theater_dvd_library for delete to authenticated using (exists(select 1 from public.owner_members where user_id=auth.uid()));
),
 category text not null default 'movies' check (category in ('cartoons-animes','movies','wrestling')),
 created_at timestamptz not null default now()
);
alter table public.theater_dvd_library enable row level security;
create policy "Public DVD listing" on public.theater_dvd_library for select to anon, authenticated using (true);
create policy "Owner DVD insert" on public.theater_dvd_library for insert to authenticated with check (exists(select 1 from public.owner_members where user_id=auth.uid()));
create policy "Owner DVD delete" on public.theater_dvd_library for delete to authenticated using (exists(select 1 from public.owner_members where user_id=auth.uid()));
