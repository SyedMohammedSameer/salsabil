-- ─── Study room moderation ────────────────────────────────────────────────────
-- A room's host can remove someone, and a removed person cannot walk straight
-- back in. Until now only a participant could delete their own row.
--
--   room_bans              who has been removed from which room
--   participants delete    the host may remove anyone from their room
--   participants insert    joining is refused while you are banned
--
-- The host can lift a ban (delete the row). Safe to run more than once.

create table if not exists public.room_bans (
  room_id    uuid        not null references public.study_rooms on delete cascade,
  user_id    uuid        not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.room_bans enable row level security;

-- Security definer so policies on other tables can ask "is this the host?"
-- without their own row-level security getting in the way.
create or replace function public.is_room_owner(p_room uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.study_rooms where id = p_room and owner_id = auth.uid());
$$;

create or replace function public.is_banned_from_room(p_room uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.room_bans where room_id = p_room and user_id = auth.uid());
$$;

grant execute on function public.is_room_owner(uuid) to authenticated;
grant execute on function public.is_banned_from_room(uuid) to authenticated;

drop policy if exists "Hosts see their bans, users see their own" on public.room_bans;
create policy "Hosts see their bans, users see their own"
  on public.room_bans for select to authenticated
  using (user_id = auth.uid() or public.is_room_owner(room_id));

drop policy if exists "Hosts ban from their rooms" on public.room_bans;
create policy "Hosts ban from their rooms"
  on public.room_bans for insert to authenticated
  with check (public.is_room_owner(room_id) and user_id <> auth.uid());

drop policy if exists "Hosts lift bans" on public.room_bans;
create policy "Hosts lift bans"
  on public.room_bans for delete to authenticated
  using (public.is_room_owner(room_id));

-- Participants: the host may remove anyone; everyone may still leave.
drop policy if exists "Users can leave" on public.room_participants;
drop policy if exists "Users leave, hosts remove" on public.room_participants;
create policy "Users leave, hosts remove"
  on public.room_participants for delete to authenticated
  using (user_id = auth.uid() or public.is_room_owner(room_id));

-- Joining is refused while banned.
drop policy if exists "Auth users can join" on public.room_participants;
drop policy if exists "Users join unless removed" on public.room_participants;
create policy "Users join unless removed"
  on public.room_participants for insert to authenticated
  with check (user_id = auth.uid() and not public.is_banned_from_room(room_id));
