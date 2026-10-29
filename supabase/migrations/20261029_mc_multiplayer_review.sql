-- REVIEW ONLY: do not apply to production without isolated integration tests.
create table if not exists public.mc_teams (
 user_id uuid primary key references auth.users(id) on delete cascade,
 team jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now(),
 constraint mc_team_shape check (jsonb_typeof(team)='array' and jsonb_array_length(team) <= 6)
);
alter table public.mc_teams enable row level security;
revoke all on public.mc_teams from anon;
grant select,insert,update on public.mc_teams to authenticated;
create policy "mc team owner read" on public.mc_teams for select to authenticated using (user_id=auth.uid());
create policy "mc team owner insert" on public.mc_teams for insert to authenticated with check (user_id=auth.uid());
create policy "mc team owner update" on public.mc_teams for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Invitations are requests only: no combat resolution, rewards or asset transfers client-side.
create table if not exists public.mc_invitations (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('battle','trade')),
 status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '5 minutes'),
 constraint mc_invitation_not_self check (sender_id <> recipient_id)
);
create index if not exists mc_invitations_recipient_idx on public.mc_invitations(recipient_id,created_at desc);
alter table public.mc_invitations enable row level security;
revoke all on public.mc_invitations from anon;
grant select,insert on public.mc_invitations to authenticated;
create policy "mc invitations participants read" on public.mc_invitations for select to authenticated using (auth.uid() in (sender_id,recipient_id));
create policy "mc invitations sender insert" on public.mc_invitations for insert to authenticated with check (sender_id=auth.uid() and status='pending' and expires_at>now() and expires_at<=now()+interval '5 minutes');
-- No UPDATE/DELETE grants: accept/decline must be server-validated RPC in a later milestone.
