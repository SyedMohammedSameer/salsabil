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

-- ─── award_coins_once ────────────────────────────────────────────────────────
-- Atomically: claim the idempotency key, credit coins, water the newest
-- non-ancient tree, and log the transaction.
--
-- Returns the new coin balance on a fresh award, or null if this exact event
-- was already paid out. Callers treat null as "nothing happened".

create or replace function award_coins_once(
  p_user_id         uuid,
  p_action          text,
  p_amount          integer,
  p_idempotency_key text,
  p_xp              integer default 0,
  p_description     text default null
)
returns integer
language plpgsql security definer as $$
declare
  v_balance integer;
  v_claimed uuid;
  v_tree_id uuid;
begin
  if p_amount <= 0 then return null; end if;

  -- security definer bypasses RLS, so a caller could otherwise credit any
  -- account by passing someone else's uuid. auth.uid() is null for the
  -- service role, which is trusted and allowed through.
  if auth.uid() is not null and p_user_id <> auth.uid() then
    raise exception 'forbidden' using hint = 'Cannot award coins to another user';
  end if;

  -- Claim the key. If another call already claimed it, insert returns no row
  -- and we bail out without paying.
  insert into public.coin_award_ledger (user_id, idempotency_key, action, amount, xp)
  values (p_user_id, p_idempotency_key, p_action::coin_action, p_amount, greatest(p_xp, 0))
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_claimed;

  if v_claimed is null then
    return null;
  end if;

  update public.profiles
  set    coins = coins + p_amount,
         updated_at = now()
  where  id = p_user_id
  returning coins into v_balance;

  insert into public.coin_transactions (user_id, action, amount, balance, description)
  values (p_user_id, p_action::coin_action, p_amount, v_balance, p_description);

  -- Water the newest tree that is not yet ancient, mirroring the client's
  -- previous waterNewestActiveTree behaviour but inside the same transaction.
  if p_xp > 0 then
    select id into v_tree_id
    from   public.garden_trees
    where  user_id = p_user_id
      and  stage <> 'ancient'
    order by planted_at desc
    limit  1;

    if v_tree_id is not null then
      -- stage is a stored column, so it must be recomputed alongside xp or the
      -- two silently diverge and the garden shows the wrong growth stage.
      update public.garden_trees
      set    xp = xp + p_xp,
             stage = compute_tree_stage(xp + p_xp)
      where  id = v_tree_id;
    end if;
  end if;

  return v_balance;
end;
$$;

revoke all on function award_coins_once(uuid, text, integer, text, integer, text) from public;
grant execute on function award_coins_once(uuid, text, integer, text, integer, text) to authenticated;

-- ─── has_been_awarded ────────────────────────────────────────────────────────
-- Lets the UI show "already claimed" state without attempting a payout.

create or replace function has_been_awarded(
  p_user_id         uuid,
  p_idempotency_key text
)
returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.coin_award_ledger
    where user_id = p_user_id and idempotency_key = p_idempotency_key
  );
$$;

revoke all on function has_been_awarded(uuid, text) from public;
grant execute on function has_been_awarded(uuid, text) to authenticated;

-- ─── Harden the pre-existing RPCs ────────────────────────────────────────────
-- award_coins and spend_coins (migration 0003) are security definer and take a
-- p_user_id, so any authenticated user could credit or drain another account by
-- passing a different uuid. Same caller check as above. Bodies are otherwise
-- unchanged.

create or replace function award_coins(
  p_user_id    uuid,
  p_action     text,
  p_amount     integer,
  p_description text default null
)
returns integer
language plpgsql security definer as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then return 0; end if;

  if auth.uid() is not null and p_user_id <> auth.uid() then
    raise exception 'forbidden' using hint = 'Cannot award coins to another user';
  end if;

  update profiles
  set    coins = coins + p_amount,
         updated_at = now()
  where  id = p_user_id
  returning coins into v_balance;

  insert into coin_transactions (user_id, action, amount, balance, description)
  values (p_user_id, p_action::coin_action, p_amount, v_balance, p_description);

  return v_balance;
end;
$$;

create or replace function spend_coins(
  p_user_id    uuid,
  p_action     text,
  p_amount     integer,
  p_description text default null
)
returns integer
language plpgsql security definer as $$
declare
  v_current integer;
  v_balance integer;
begin
  if auth.uid() is not null and p_user_id <> auth.uid() then
    raise exception 'forbidden' using hint = 'Cannot spend another user''s coins';
  end if;

  -- Lock the row so two concurrent spends cannot both pass the balance check
  -- and drive coins negative.
  select coins into v_current from profiles where id = p_user_id for update;

  if v_current < p_amount then
    raise exception 'insufficient_coins' using hint = 'Not enough coins';
  end if;

  update profiles
  set    coins = coins - p_amount,
         updated_at = now()
  where  id = p_user_id
  returning coins into v_balance;

  insert into coin_transactions (user_id, action, amount, balance, description)
  values (p_user_id, p_action::coin_action, -p_amount, v_balance, p_description);

  return v_balance;
end;
$$;

-- ─── Backfill guard ──────────────────────────────────────────────────────────
-- Existing users keep their balances; the ledger simply starts empty. The
-- first time they repeat an action they will be paid once more and the key
-- locks in from then on. That is a deliberate one-time grace rather than a
-- reconciliation pass over historical coin_transactions, which has no
-- event identity to key on.
