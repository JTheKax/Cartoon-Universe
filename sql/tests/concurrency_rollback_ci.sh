#!/usr/bin/env bash
# Isolated CI-only integration tests. No external Supabase credentials.
set -euo pipefail
export PGOPTIONS='-c statement_timeout=15000'
psql -v ON_ERROR_STOP=1 <<'SQL'
-- Distinct disposable player, never the one used by the basic integration test.
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000003');
insert into public.coin_wallets(user_id,balance) values ('00000000-0000-0000-0000-000000000003',300);
SQL
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cat > "$tmp/claim.sql" <<'SQL'
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"is_anonymous":false}',true);
select (public.claim_daily_cartoon_coins()->>'claimed') as claimed;
commit;
SQL
# Two real database connections started concurrently; each transaction commits.
psql -At -f "$tmp/claim.sql" >"$tmp/first" 2>"$tmp/first.err" &
a=$!
psql -At -f "$tmp/claim.sql" >"$tmp/second" 2>"$tmp/second.err" &
b=$!
wait "$a" || { cat "$tmp/first.err"; exit 1; }
wait "$b" || { cat "$tmp/second.err"; exit 1; }
# psql -At also prints BEGIN/COMMIT and set_config output; select only booleans.
results="$(grep -h -E '^(true|false)$' "$tmp/first" "$tmp/second" | sort | paste -sd ' ' -)"
if [[ "$results" != "false true" ]]; then
  echo "Expected exactly one successful and one duplicate claim; got: $results"
  cat "$tmp/first" "$tmp/second"; exit 1
fi
psql -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare n integer; bal bigint;
begin
 select count(*) into n from public.coin_transactions
  where user_id='00000000-0000-0000-0000-000000000003' and reason='daily_reward';
 select balance into bal from public.coin_wallets
  where user_id='00000000-0000-0000-0000-000000000003';
 if n<>1 or bal<>325 then
   raise exception 'Concurrent claim double credited: transactions %, balance %',n,bal;
 end if;
end $$;
SQL

# Inject a failing transaction insert on a fresh disposable player.
psql -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000004');
insert into public.coin_wallets(user_id,balance) values ('00000000-0000-0000-0000-000000000004',700);
create function public.ci_reject_reward() returns trigger language plpgsql as $$
begin
 if new.user_id='00000000-0000-0000-0000-000000000004' and new.reason='daily_reward' then
   raise exception 'CI injected transaction failure';
 end if;
 return new;
end $$;
create trigger ci_reject_reward before insert on public.coin_transactions
 for each row execute function public.ci_reject_reward();
SQL
# The RPC must fail. Because PostgreSQL rolls back the statement on exception,
# no coin balance update or daily claim can survive.
cat > "$tmp/failure.sql" <<'SQL'
\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claims','{"is_anonymous":false}',false);
select public.claim_daily_cartoon_coins();
SQL
if psql -f "$tmp/failure.sql" >"$tmp/failure.out" 2>"$tmp/failure.err"; then
 echo "Expected injected transaction failure, but RPC succeeded"; exit 1
fi
grep -q 'CI injected transaction failure' "$tmp/failure.err" || { cat "$tmp/failure.err"; exit 1; }
psql -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare bal bigint; n integer; claims integer;
begin
 select balance into bal from public.coin_wallets
  where user_id='00000000-0000-0000-0000-000000000004';
 select count(*) into n from public.coin_transactions
  where user_id='00000000-0000-0000-0000-000000000004' and reason='daily_reward';
 select count(*) into claims from public.coin_daily_claims
  where user_id='00000000-0000-0000-0000-000000000004';
 if bal<>700 or n<>0 or claims<>0 then
   raise exception 'Rollback failed: balance %, transactions %, claims %',bal,n,claims;
 end if;
end $$;
SQL
echo 'Concurrency and rollback integration tests passed'
