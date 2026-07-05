-- V2 — "Living World" (replaces the garden as the core gamification loop).
--
-- A user has ONE world: a biome (v1 ships desert) + an avatar variant, plus an
-- inventory of items they've bought with coins. Accessories layer onto the
-- avatar when equipped; decorations appear in the scene once owned.
--
-- Coins are NOT manipulated directly here — buy_world_item delegates to the
-- existing spend_coins() RPC so balance handling stays in exactly one place
-- (spend_coins + the sync_coins_after_tx trigger). This keeps purchases atomic
-- with the coin debit: if the user can't afford it, the whole thing rolls back.
--
-- Run in Supabase SQL Editor.

-- ─── world_state — one row per user ──────────────────────────────────────────
create table public.world_state (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  biome          text not null default 'desert'
                     check (biome in ('desert', 'ocean', 'forest', 'meadow', 'night')),
  avatar_variant text not null default 'man'
                     check (avatar_variant in ('man', 'woman')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger world_state_updated_at
  before update on public.world_state
  for each row execute function public.handle_updated_at();

-- ─── world_items — a user's owned inventory ──────────────────────────────────
create table public.world_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  item_key    text not null,
  category    text not null check (category in ('accessory', 'decoration')),
  slot        text check (slot in ('hat', 'outer', 'held', 'companion')),
  equipped    boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique (user_id, item_key)
);

create index world_items_user_idx on public.world_items(user_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.world_state enable row level security;
alter table public.world_items enable row level security;

create policy "world_state: own select" on public.world_state for select using (auth.uid() = user_id);
create policy "world_state: own insert" on public.world_state for insert with check (auth.uid() = user_id);
create policy "world_state: own update" on public.world_state for update using (auth.uid() = user_id);

create policy "world_items: own select" on public.world_items for select using (auth.uid() = user_id);
create policy "world_items: own insert" on public.world_items for insert with check (auth.uid() = user_id);
create policy "world_items: own update" on public.world_items for update using (auth.uid() = user_id);
create policy "world_items: own delete" on public.world_items for delete using (auth.uid() = user_id);

-- ─── buy_world_item ──────────────────────────────────────────────────────────
-- Atomically debits coins (via spend_coins) and grants the item. Raises
-- 'already_owned' if the user already has it, or bubbles up spend_coins'
-- 'insufficient_coins'. Returns the new coin balance.
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
  if exists (
    select 1 from public.world_items
    where user_id = p_user_id and item_key = p_item_key
  ) then
    raise exception 'already_owned' using hint = 'Item already owned';
  end if;

  if p_cost > 0 then
    -- Reuses the canonical coin path; raises 'insufficient_coins' on failure,
    -- which rolls back this whole function.
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

-- ─── equip_world_item ────────────────────────────────────────────────────────
-- Equips one accessory in a slot, unequipping anything else in that slot so a
-- slot only ever holds one item. Pass p_equip = false to just take it off.
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
