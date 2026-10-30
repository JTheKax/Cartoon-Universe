-- REVIEW ONLY. Apply to disposable PostgreSQL / local Supabase only.
-- Production global maintenance is unchanged until a separate approved release.
begin;
-- Production has updated_at already; the old disposable fixture did not.
alter table public.site_maintenance add column if not exists updated_at timestamptz not null default now();
create table if not exists public.global_maintenance_audit (
 id bigint generated always as identity primary key,
 previous_enabled boolean not null,
 maintenance_enabled boolean not null,
 previous_message text not null,
 message text not null,
 owner_id uuid not null references auth.users(id),
 changed_at timestamptz not null default now()
);
alter table public.global_maintenance_audit enable row level security;
revoke all on public.global_maintenance_audit from public, anon, authenticated;
-- Eliminate unaudited owner browser UPDATE; all changes must use audited RPC.
revoke update on public.site_maintenance from public, anon, authenticated;

create or replace function public.set_global_maintenance(p_enabled boolean,p_message text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
 actor uuid := auth.uid();
 previous_enabled boolean;
 previous_message text;
 next_message text;
begin
 if actor is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    or not exists (select 1 from public.owner_members where user_id=actor) then
  raise exception 'Verified owner required' using errcode='28000';
 end if;
 if p_enabled is null then
  raise exception 'Boolean maintenance state required' using errcode='22023';
 end if;
 if p_message is not null and (length(btrim(p_message))<1 or length(p_message)>280) then
  raise exception 'Message must be 1 to 280 characters' using errcode='22023';
 end if;
 select enabled,message into previous_enabled,previous_message
  from public.site_maintenance where id=true for update;
 if not found then
  raise exception 'Global maintenance row missing' using errcode='22023';
 end if;
 next_message := coalesce(p_message,previous_message);
 update public.site_maintenance
  set enabled=p_enabled,message=next_message,updated_by=actor,updated_at=now()
  where id=true;
 insert into public.global_maintenance_audit
  (previous_enabled,maintenance_enabled,previous_message,message,owner_id)
  values(previous_enabled,p_enabled,previous_message,next_message,actor);
 return jsonb_build_object('saved',true,'audited',true,'globalMaintenance',p_enabled);
end;
$$;
revoke all on function public.set_global_maintenance(boolean,text) from public, anon, authenticated;
grant execute on function public.set_global_maintenance(boolean,text) to authenticated;
commit;
