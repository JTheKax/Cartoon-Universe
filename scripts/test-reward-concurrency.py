"""Exercise real overlapping reward transactions in the disposable CI database."""
import concurrent.futures
import json
import os
import subprocess
import time

if os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('PGDATABASE') != 'cartoon_coins_ci':
    raise SystemExit('This harness requires the disposable GitHub CI database.')

PSQL = ['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '--host=127.0.0.1',
        '--port=5432', '--username=postgres', '--dbname=cartoon_coins_ci']


def query(sql):
    return subprocess.run(PSQL, input=sql, text=True, capture_output=True,
                          check=True, timeout=20).stdout.strip()


# Use an existing fixture account; all earlier SQL tests roll their work back.
# An interactive holder makes both RPC transactions wait on the same wallet row.
holder = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True)
workers = concurrent.futures.ThreadPoolExecutor(max_workers=2)
try:
    holder.stdin.write("begin;\nselect user_id from public.coin_wallets where user_id='00000000-0000-0000-0000-000000000001' for update;\n\\echo LOCKED\n")
    holder.stdin.flush()
    # readline is bounded by the process-wide CI step timeout.
    while True:
        line = holder.stdout.readline()
        if line.strip() == 'LOCKED':
            break
        if not line:
            raise RuntimeError('Wallet lock holder exited before acquiring its lock')

    sql = """begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role='authenticated';
set local request.jwt.claims='{"is_anonymous":false}';
select public.claim_daily_cartoon_coins() /* ci_concurrent_reward */;
commit;
"""
    futures = [workers.submit(query, sql) for _ in range(2)]
    deadline = time.monotonic() + 10
    while True:
        waiting = query("select count(*) from pg_stat_activity where pid<>pg_backend_pid() and state='active' and wait_event_type='Lock' and query like '%ci_concurrent_reward%';")
        if waiting == '2':
            break
        if time.monotonic() >= deadline:
            raise RuntimeError('Both RPC sessions did not overlap waiting for the wallet lock')
        time.sleep(0.1)
    holder.stdin.write('commit;\n\\q\n')
    holder.stdin.flush()
    holder.wait(timeout=10)
    results = [json.loads(f.result(timeout=20)) for f in futures]
    if sorted(r['awarded'] for r in results) != [0, 25]:
        raise RuntimeError(f'Concurrent claims awarded incorrectly: {results}')
    if sorted(r['claimed'] for r in results) != [False, True] or any(r['balance'] != 125 for r in results):
        raise RuntimeError(f'Concurrent claim responses disagree: {results}')
    state = query("""select jsonb_build_object(
      'balance',(select balance from public.coin_wallets where user_id='00000000-0000-0000-0000-000000000001'),
      'transactions',(select count(*) from public.coin_transactions where user_id='00000000-0000-0000-0000-000000000001'),
      'claims',(select count(*) from public.coin_daily_claims where user_id='00000000-0000-0000-0000-000000000001'),
      'linked',(select count(*) from public.coin_daily_claims c join public.coin_transactions t on t.id=c.transaction_id and t.user_id=c.user_id where c.user_id='00000000-0000-0000-0000-000000000001' and t.amount=25 and t.reason='daily_reward'));
    """)
    if json.loads(state) != {'balance': 125, 'transactions': 1, 'claims': 1, 'linked': 1}:
        raise RuntimeError(f'Concurrent reward ledger invariant failed: {state}')
    print('Overlapping authenticated claims awarded exactly 25 coins with one linked ledger entry.')
finally:
    if holder.poll() is None:
        holder.kill()
        holder.wait(timeout=5)
    workers.shutdown(wait=True, cancel_futures=True)
