-- V2 — Pixel character system (Stage 1).
--
-- Adds free "identity" customization to world_state (skin tone + hair/hijab
-- colour) and widens the world_items equip slots so fashion items (full
-- outfits, glasses) can be owned and worn alongside hats/held/companions.
--
-- Run in Supabase SQL Editor (after 0007_world_xp.sql).

alter table public.world_state
  add column if not exists skin_tone  text not null default 'tan',
  add column if not exists hair_color text not null default 'brown',
  add column if not exists hijab_color text not null default 'coral';

-- Widen the equip-slot check to include 'outfit' and 'face'.
alter table public.world_items drop constraint if exists world_items_slot_check;
alter table public.world_items
  add constraint world_items_slot_check
  check (slot in ('hat', 'outer', 'held', 'companion', 'outfit', 'face'));
