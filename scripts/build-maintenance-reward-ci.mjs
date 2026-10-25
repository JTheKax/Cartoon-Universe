// CI ONLY: full daily reward function with maintenance guard is generated
// from the existing migration, preserving all reward logic and grants.
// The generator writes the guarded SQL to stdout; never apply to production.
import {readFileSync} from 'node:fs';
const original=readFileSync('sql/cartoon_coin_daily_reward.sql','utf8');
const marker='  -- The wallet row is the per-user lock;';
if(!original.includes(marker)) throw Error('Reward migration changed: review guard insertion');
const guard=`  if exists(select 1 from public.site_maintenance where id=true and enabled=true)
     and not exists(select 1 from public.owner_members where user_id=player_id) then
    raise exception 'Cartoon Universe is temporarily under maintenance'
      using errcode='P0001';
  end if;

`;
process.stdout.write(original.replace(marker,guard+marker));
