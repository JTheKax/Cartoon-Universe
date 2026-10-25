-- Disposable local Supabase containers ONLY; no fake Auth functions or users.
-- Public wallet fixture matches the isolated reward contract, not a full production dump.
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
create table public.site_maintenance(
 id boolean primary key default true check(id=true),
 enabled boolean not null default false,
 message text not null default 'Maintenance',
 updated_by uuid references auth.users(id)
);
alter table public.owner_members enable row level security;
alter table public.site_maintenance enable row level security;
create policy maintenance_read on public.site_maintenance
 for select to anon,authenticated using(true);
create policy maintenance_owner_update on public.site_maintenance
 for update to authenticated
 using(exists(select 1 from public.owner_members where user_id=(select auth.uid())))
 with check(exists(select 1 from public.owner_members where user_id=(select auth.uid()))
   and updated_by=(select auth.uid()));
grant select on public.owner_members to authenticated;
grant select on public.site_maintenance to anon,authenticated;
grant update on public.site_maintenance to authenticated;


insert into public.site_maintenance(id,enabled,message) values(true,false,'Local integration test maintenance');
alter table public.profiles add column presence_mode text not null default 'offline';
revoke all on public.coin_wallets,public.coin_transactions from public,anon,authenticated;
grant select on public.coin_wallets,public.coin_transactions to authenticated;
