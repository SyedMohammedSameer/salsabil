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
