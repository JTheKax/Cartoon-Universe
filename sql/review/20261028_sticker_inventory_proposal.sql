-- REVIEW PROPOSAL ONLY. DO NOT RUN ON PRODUCTION SUPABASE.
-- Test only against a disposable PostgreSQL/Supabase instance.
-- Requires public.owner_members and auth.users from the existing account schema.
begin;
create table public.sticker_sets (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check(length(btrim(title)) between 1 and 80),
 published boolean not null default false,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.stickers (
 id uuid primary key default gen_random_uuid(),
 set_id uuid not null references public.sticker_sets(id) on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 70),
 rarity text not null check(rarity in ('Common','Uncommon','Rare','Epic','Legendary','Prize Only')),
 image_path text check(image_path is null or image_path ~ '^assets/stickers/[A-Za-z0-9_/-]+\\.(png|jpg|jpeg|webp)$'),
 published boolean not null default false,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.player_stickers (
 user_id uuid not null references auth.users(id) on delete cascade,
 sticker_id uuid not null references public.stickers(id) on delete restrict,
 quantity bigint not null check(quantity between 1 and 1000000000),
 acquired_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,sticker_id)
);
create table public.sticker_inventory_events (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 sticker_id uuid not null references public.stickers(id),
 quantity_delta integer not null check(quantity_delta between 1 and 100),
 reason text not null check(length(btrim(reason)) between 3 and 120),
 created_at timestamptz not null default now()
);
create index player_stickers_by_sticker on public.player_stickers(sticker_id);
create index sticker_events_by_recipient on public.sticker_inventory_events(recipient_id,created_at desc);
create index stickers_by_set on public.stickers(set_id,published);

alter table public.sticker_sets enable row level security;
alter table public.stickers enable row level security;
alter table public.player_stickers enable row level security;
alter table public.sticker_inventory_events enable row level security;
-- RLS protects all tables, including the audit ledger. No client write policies.
create policy sticker_sets_read on public.sticker_sets for select to authenticated
 using (published or exists(select 1 from public.owner_members where user_id=(select auth.uid())));
create policy stickers_read on public.stickers for select to authenticated
 using ((published and exists(select 1 from public.sticker_sets where id=set_id and published))
  or exists(select 1 from public.owner_members where user_id=(select auth.uid())));
create policy own_sticker_inventory_read on public.player_stickers for select to authenticated
 using (user_id=(select auth.uid()));
create policy own_sticker_events_read on public.sticker_inventory_events for select to authenticated
 using (recipient_id=(select auth.uid()) or exists(select 1 from public.owner_members where user_id=(select auth.uid())));

revoke all on public.sticker_sets,public.stickers,public.player_stickers,public.sticker_inventory_events from public,anon,authenticated;
grant select on public.sticker_sets,public.stickers,public.player_stickers,public.sticker_inventory_events to authenticated;

-- Controlled grant function: callable by signed-in accounts but executes only for verified owners.
-- No browser role may directly INSERT/UPDATE/DELETE inventory or audit events.
create function public.owner_award_sticker(
 p_recipient uuid,p_sticker uuid,p_quantity integer,p_reason text
) returns bigint language plpgsql security definer set search_path = ''
as $$
declare v_balance bigint;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
   or not exists(select 1 from public.owner_members where user_id=auth.uid())
 then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_quantity is null or p_quantity not between 1 and 100
 then raise exception 'Invalid quantity' using errcode='22023'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 3 and 120
 then raise exception 'Invalid reason' using errcode='22023'; end if;
 if p_recipient is null or not exists(select 1 from auth.users where id=p_recipient)
 then raise exception 'Unknown recipient' using errcode='22023'; end if;
 if p_sticker is null or not exists(
   select 1 from public.stickers s join public.sticker_sets t on t.id=s.set_id
   where s.id=p_sticker and s.published and t.published
 ) then raise exception 'Sticker is not published' using errcode='22023'; end if;
 insert into public.player_stickers(user_id,sticker_id,quantity)
 values(p_recipient,p_sticker,p_quantity)
 on conflict(user_id,sticker_id) do update
 set quantity=public.player_stickers.quantity+excluded.quantity,updated_at=now()
 returning quantity into v_balance;
 insert into public.sticker_inventory_events(actor_id,recipient_id,sticker_id,quantity_delta,reason)
 values(auth.uid(),p_recipient,p_sticker,p_quantity,btrim(p_reason));
 return v_balance;
end;
$$;
revoke all on function public.owner_award_sticker(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.owner_award_sticker(uuid,uuid,integer,text) to authenticated;
commit;
