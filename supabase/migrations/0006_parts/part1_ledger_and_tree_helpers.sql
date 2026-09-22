-- Economy rebuild.
--
-- Two problems this migration solves:
--
--   1. Every coin award in the app was fire-and-forget. Toggling a task
--      complete -> incomplete -> complete paid out each time; reloading a
--      finished study room paid out again. The client-side guards were
--      in-memory refs, so they died with the page.
--
--   2. There was no server-side record of *why* a user was paid, so a
--      duplicate could not be detected after the fact.
--
-- The fix is an idempotency ledger. Every earn-side award now carries a
-- caller-supplied key that is unique per real-world event
-- (e.g. 'prayer:2026-09-21:fajr'). award_coins_once inserts that key inside
-- the same transaction as the payout, so a replay is a no-op at the database
-- level regardless of what the client does.
--
-- Spend-side actions (tree purchases, watering) are deliberately NOT routed
-- through the ledger: buying two trees is a legitimate repeat action.
--
-- Every statement here is idempotent, so the whole file can be re-run safely
-- after a partial application. The Supabase SQL editor can silently truncate a
-- large paste, which leaves an unterminated $$ block and applies nothing after
-- it; re-running is then the fix, not a risk.

-- ─── Award ledger ────────────────────────────────────────────────────────────

create table if not exists public.coin_award_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  idempotency_key text not null,
  action          coin_action not null,
  amount          integer not null check (amount > 0),
  xp              integer not null default 0 check (xp >= 0),
  created_at      timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists coin_award_ledger_user_idx
  on public.coin_award_ledger(user_id, created_at desc);

alter table public.coin_award_ledger enable row level security;

-- Read-only to the owner. Writes happen exclusively through the security
-- definer function below, so there is no insert/update/delete policy.
drop policy if exists "coin_award_ledger_select_own" on public.coin_award_ledger;
create policy "coin_award_ledger_select_own"
  on public.coin_award_ledger for select
  using (auth.uid() = user_id);

-- ─── compute_tree_stage ──────────────────────────────────────────────────────
-- garden_trees.stage is a stored column, not a generated one, so any writer
-- that touches xp must recompute it or the two silently diverge. These
-- thresholds mirror computeStage() / XP_THRESHOLDS in src/lib/api/garden.ts —
-- change both together.

create or replace function compute_tree_stage(p_xp integer)
returns tree_stage
language sql immutable as $$
  select case
    when p_xp <  10  then 'seed'::tree_stage
    when p_xp <  30  then 'sprout'::tree_stage
    when p_xp <  70  then 'sapling'::tree_stage
    when p_xp < 150  then 'young'::tree_stage
    when p_xp < 300  then 'mature'::tree_stage
    else                  'ancient'::tree_stage
  end;
$$;

-- ─── add_tree_xp ─────────────────────────────────────────────────────────────
-- Atomic replacement for the client's read-then-write addXPToTree, which could
-- lose XP when two actions completed at the same moment.

create or replace function add_tree_xp(p_tree_id uuid, p_xp integer)
returns public.garden_trees
language plpgsql security definer as $$
declare
  v_tree public.garden_trees;
begin
  -- security definer bypasses RLS, so scope the write to the caller's own
  -- trees explicitly. auth.uid() is null for the service role, which is
  -- trusted and allowed through.
  update public.garden_trees
  set    xp = xp + greatest(p_xp, 0),
         stage = compute_tree_stage(xp + greatest(p_xp, 0)),
         last_watered_at = now()
  where  id = p_tree_id
    and  (auth.uid() is null or user_id = auth.uid())
  returning * into v_tree;

  if v_tree.id is null then
    raise exception 'tree_not_found' using hint = 'No such tree for this user';
  end if;

  return v_tree;
end;
$$;

revoke all on function add_tree_xp(uuid, integer) from public;
grant execute on function add_tree_xp(uuid, integer) to authenticated;

