-- V2 — Living World XP + security hardening.
--
-- 1. Adds world_state.xp — a lifetime "world experience" score that grows with
--    every coin-earning action (focus, prayer, tasks, workouts, challenges…).
--    Unlike coins, XP never decreases when you spend, so it's a pure record of
--    effort and drives the world's visual growth (level).
-- 2. A trigger feeds XP from coin_transactions, so no client change is needed —
--    any action that earns coins also grows the world, atomically.
-- 3. Hardens buy_world_item / equip_world_item: because they are SECURITY
--    DEFINER (needed to touch coins/inventory), they MUST verify the caller
--    owns the row — otherwise a signed-in user could pass someone else's id.
--
-- Run in Supabase SQL Editor (after 0006_world.sql).

-- ─── xp column ───────────────────────────────────────────────────────────────
alter table public.world_state
  add column if not exists xp integer not null default 0;

-- Backfill existing worlds from the coin ledger (lifetime coins earned).
update public.world_state ws
set xp = coalesce(
  (select sum(ct.amount)
   from public.coin_transactions ct
   where ct.user_id = ws.user_id and ct.amount > 0),
  0
);

-- ─── feed_world_xp — grow the world on every earned coin ──────────────────────
-- Fires after the daily-cap trigger has already adjusted new.amount, so XP
-- tracks coins actually credited. No-ops if the user hasn't opened their world
-- yet (0 rows); ensure_world_state seeds xp from the ledger on first open.
create or replace function public.feed_world_xp()
returns trigger language plpgsql security definer as $$
begin
  if new.amount > 0 then
    update public.world_state
    set xp = xp + new.amount
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists feed_world_xp_after_tx on public.coin_transactions;
create trigger feed_world_xp_after_tx
  after insert on public.coin_transactions
  for each row execute function public.feed_world_xp();

-- ─── Hardened buy_world_item ─────────────────────────────────────────────────
create or replace function public.buy_world_item(
  p_user_id  uuid,
  p_item_key text,
  p_category text,
  p_slot     text,
  p_cost     integer,
  p_name     text default null
)
returns integer
language plpgsql security definer as $$
declare
  v_balance integer;
begin
  if p_user_id <> auth.uid() then
    raise exception 'not_authorized' using hint = 'Cannot act for another user';
  end if;

  if exists (
    select 1 from public.world_items
    where user_id = p_user_id and item_key = p_item_key
  ) then
    raise exception 'already_owned' using hint = 'Item already owned';
  end if;

  if p_cost > 0 then
    v_balance := public.spend_coins(
      p_user_id, 'tree_purchase', p_cost, coalesce(p_name, p_item_key)
    );
  else
    select coins into v_balance from public.profiles where id = p_user_id;
  end if;

  insert into public.world_items (user_id, item_key, category, slot)
  values (p_user_id, p_item_key, p_category, p_slot);

  return v_balance;
end;
$$;

-- ─── Hardened equip_world_item ───────────────────────────────────────────────
create or replace function public.equip_world_item(
  p_user_id uuid,
  p_item_id uuid,
  p_equip   boolean default true
)
returns void
language plpgsql security definer as $$
declare
  v_slot text;
begin
  if p_user_id <> auth.uid() then
    raise exception 'not_authorized' using hint = 'Cannot act for another user';
  end if;

  select slot into v_slot
  from public.world_items
  where id = p_item_id and user_id = p_user_id;

  if v_slot is null then
    raise exception 'not_an_accessory' using hint = 'Item has no equip slot';
  end if;

  if p_equip then
    update public.world_items
    set equipped = false
    where user_id = p_user_id and slot = v_slot and id <> p_item_id;
  end if;

  update public.world_items
  set equipped = p_equip
  where id = p_item_id and user_id = p_user_id;
end;
$$;
