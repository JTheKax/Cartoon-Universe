create table if not exists public.global_chat_messages (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 500),
 created_at timestamptz not null default now()
);
create index if not exists global_chat_messages_recent_idx on public.global_chat_messages(created_at desc);
alter table public.global_chat_messages enable row level security;
revoke all on public.global_chat_messages from public,anon;
grant select,insert on public.global_chat_messages to authenticated;
create policy "signed in users read global chat" on public.global_chat_messages for select to authenticated using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
create policy "signed in users post own chat" on public.global_chat_messages for insert to authenticated with check (user_id=(select auth.uid()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
create or replace function public.global_chat_post_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.user_id is distinct from auth.uid() then raise exception 'Invalid sender'; end if;
 if exists(select 1 from public.global_chat_messages where user_id=auth.uid() and created_at>now()-interval '3 seconds') then raise exception 'Please wait 3 seconds between messages'; end if;
 new.body=btrim(new.body);
 return new;
end $$;
create trigger global_chat_post_guard_trigger before insert on public.global_chat_messages for each row execute function public.global_chat_post_guard();
revoke all on function public.global_chat_post_guard() from public,anon,authenticated;