-- Disposable PostgreSQL-only Supabase contract fixture. Never use in production.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;
create function auth.role() returns text language sql stable as $$
 select nullif(current_setting('request.jwt.claim.role', true),'')
$$;
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
create table auth.users(id uuid primary key);
create table public.coin_wallets(
 user_id uuid primary key references auth.users(id),
 balance bigint not null default 0 check(balance>=0),
 updated_at timestamptz not null default now()
);
create table public.coin_transactions(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id),
 amount bigint not null check(amount<>0),
 reason text not null,
 created_at timestamptz not null default now()
);
alter table public.coin_wallets enable row level security;
alter table public.coin_transactions enable row level security;
create policy wallet_read on public.coin_wallets for select to authenticated using (auth.uid()=user_id);
create policy transactions_read on public.coin_transactions for select to authenticated using (auth.uid()=user_id);
grant usage on schema public,auth to authenticated,anon;
grant execute on all functions in schema auth to authenticated,anon;
grant select on public.coin_wallets,public.coin_transactions to authenticated;
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002');
insert into public.coin_wallets(user_id,balance) values
 ('00000000-0000-0000-0000-000000000001',100),
 ('00000000-0000-0000-0000-000000000002',500);
