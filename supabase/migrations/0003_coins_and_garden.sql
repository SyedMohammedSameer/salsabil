-- V2 Phase 2: Atomic coin RPCs for garden system
-- Run in Supabase SQL Editor

-- ─── award_coins ─────────────────────────────────────────────────────────────
-- Atomically increments profile.coins and logs the transaction.
-- Returns the new balance.

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

-- ─── spend_coins ─────────────────────────────────────────────────────────────
-- Atomically deducts coins and logs the transaction.
-- Returns new balance, or raises an exception if balance is insufficient.

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
  select coins into v_current from profiles where id = p_user_id;

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
