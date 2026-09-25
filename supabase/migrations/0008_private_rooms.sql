-- ─── Private study rooms ──────────────────────────────────────────────────────
-- A private room is one that is not listed publicly but can be joined by its
-- code. Until now it could not be joined at all: the select policy on
-- study_rooms only showed a private room to its owner, so looking its code up,
-- or loading it after joining, returned nothing for anyone else.
--
-- Two changes:
--   1. find_room_by_code looks a room up by its exact code, public or private.
--      Knowing the code is the invitation; the function returns only that one
--      room, so private rooms still cannot be listed or searched.
--   2. The select policy also shows a room to the people currently in it, so
--      a participant can load the room they joined by code.
--
-- Safe to run more than once.

create or replace function find_room_by_code(p_code text)
returns setof public.study_rooms
language sql security definer stable
set search_path = public
as $$
  select *
  from   public.study_rooms
  where  code = upper(trim(p_code))
  limit  1;
$$;

revoke all on function find_room_by_code(text) from public;
grant execute on function find_room_by_code(text) to authenticated;

drop policy if exists "Public rooms viewable by auth users" on study_rooms;
drop policy if exists "Rooms viewable by owner, participants, or when public" on study_rooms;

create policy "Rooms viewable by owner, participants, or when public"
  on study_rooms for select to authenticated
  using (
    is_public
    or owner_id = auth.uid()
    or exists (
      select 1 from public.room_participants p
      where  p.room_id = study_rooms.id
        and  p.user_id = auth.uid()
    )
  );
