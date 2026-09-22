-- In-app account deletion.
--
-- App Store Review Guideline 5.1.1(v) requires any app that lets a user create
-- an account to also let them delete it from inside the app. An email address
-- to write to is explicitly not sufficient, and this is a common rejection.
-- Google Play has an equivalent requirement.
--
-- Deleting the auth.users row is what actually removes the account; every
-- application table references public.profiles, which references auth.users
-- with `on delete cascade`, so the user's prayers, tasks, logs, garden, coins
-- and chat history all go with it.
--
-- auth.users is not writable by the anon or authenticated roles, so this runs
-- as a security definer function — but only ever against the caller's own row.

create or replace function delete_own_account()
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using hint = 'No active session';
  end if;

  -- Rows that reference auth.users directly rather than through profiles, so
  -- they are not covered by the cascade below.
  delete from public.room_participants where user_id = v_uid;
  delete from public.room_messages     where user_id = v_uid;

  -- A room's other participants should not lose their room because its owner
  -- left the product; hand ownership to the longest-standing participant, and
  -- only delete the room when there is nobody left to hand it to.
  update public.study_rooms r
  set    owner_id = (
           select p.user_id
           from   public.room_participants p
           where  p.room_id = r.id and p.user_id <> v_uid
           order  by p.joined_at asc
           limit  1
         )
  where  r.owner_id = v_uid
    and  exists (
           select 1 from public.room_participants p
           where p.room_id = r.id and p.user_id <> v_uid
         );

  delete from public.study_rooms where owner_id = v_uid;

  -- Cascades through public.profiles to every other table.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function delete_own_account() from public;
grant execute on function delete_own_account() to authenticated;
