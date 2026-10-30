-- Disposable database only: run after ci_bootstrap.sql, supabase/schema.sql,
-- and sql/review/20261028_sticker_inventory_proposal.sql.
insert into public.owner_members(user_id) values('00000000-0000-0000-0000-000000000001');
insert into public.sticker_sets(id,slug,title,published,created_by) values
 ('10000000-0000-0000-0000-000000000001','arcade-originals','Arcade Originals',true,'00000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002','hidden','Unreleased',false,'00000000-0000-0000-0000-000000000001');
insert into public.stickers(id,set_id,name,rarity,published) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Pixel Hero','Rare',true),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Secret Sticker','Legendary',false);
-- Isolated test role simulates Supabase Auth; production permissions are not changed.
grant select on public.owner_members to authenticated;
do $$
begin
 if has_table_privilege('authenticated','public.player_stickers','INSERT')
 or has_table_privilege('authenticated','public.player_stickers','UPDATE')
 or has_table_privilege('authenticated','public.player_stickers','DELETE')
 or has_table_privilege('authenticated','public.sticker_inventory_events','INSERT')
 then raise exception 'Client write privilege leaked'; end if;
 if has_table_privilege('anon','public.stickers','SELECT')
 or has_function_privilege('anon','public.owner_award_sticker(uuid,uuid,integer,text)','EXECUTE')
 then raise exception 'Anonymous sticker privilege leaked'; end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$
begin
 if (select count(*) from public.sticker_sets)<>1
 or (select count(*) from public.stickers)<>1 then raise exception 'Draft catalog leaked'; end if;
 begin
  perform public.owner_award_sticker('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',1,'Fake player award');
  raise exception 'Nonowner could award stickers';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$
declare n bigint;
begin
 n:=public.owner_award_sticker('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',2,'Mock owner grant');
 if n<>2 then raise exception 'First owner grant failed'; end if;
 n:=public.owner_award_sticker('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',1,'Second mock grant');
 if n<>3 then raise exception 'Atomic duplicate grant failed'; end if;
 begin
  perform public.owner_award_sticker('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002',1,'Unpublished sticker');
  raise exception 'Owner awarded unpublished sticker';
 exception when invalid_parameter_value then null; end;
end $$;
-- The owner cannot directly read a different player's inventory.
do $$
begin
 if (select count(*) from public.player_stickers)<>0 then raise exception 'Other user inventory leaked'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$
begin
 if (select sum(quantity) from public.player_stickers)<>3 then raise exception 'Recipient inventory incorrect'; end if;
 if (select count(*) from public.sticker_inventory_events)<>2 then raise exception 'Award ledger incorrect'; end if;
end $$;
-- Signed-in players cannot insert into inventory or forge audit history.
do $$
begin
 begin
  insert into public.player_stickers(user_id,sticker_id,quantity)
  values('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',99);
  raise exception 'Player inserted directly into inventory';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.sticker_inventory_events(actor_id,recipient_id,sticker_id,quantity_delta,reason)
  values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',99,'Forged reward');
  raise exception 'Player forged an inventory audit event';
 exception when insufficient_privilege then null; end;
end $$;
-- Owner awards reject invalid quantities and leave the ledger unchanged.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$
begin
 begin
  perform public.owner_award_sticker('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',0,'Invalid quantity');
  raise exception 'Zero-quantity award was accepted';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.owner_award_sticker('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',101,'Invalid quantity');
  raise exception 'Over-limit award was accepted';
 exception when invalid_parameter_value then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$
begin
 if (select sum(quantity) from public.player_stickers)<>3
 or (select count(*) from public.sticker_inventory_events)<>2
 then raise exception 'Invalid owner award changed inventory or audit ledger'; end if;
end $$;
reset role;
do $$
begin
 if (select count(*) from public.sticker_inventory_events)<>2 then raise exception 'Audit rows not committed'; end if;
end $$;
