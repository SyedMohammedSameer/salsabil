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

