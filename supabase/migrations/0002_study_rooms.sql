-- V2 Phase 1: Real-time Study Rooms
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ─── Enum ───────────────────────────────────────────────────────────────────

create type if not exists timer_state as enum ('idle', 'running', 'paused', 'done');

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists study_rooms (
  id               uuid        primary key default gen_random_uuid(),
  code             text        unique not null
                               default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  name             text        not null,
  description      text,
  owner_id         uuid        not null references auth.users,
  is_public        boolean     not null default true,
  max_participants integer     not null default 10 check (max_participants between 2 and 50),
  timer_duration   integer     not null default 25  check (timer_duration > 0),  -- minutes
  timer_state      timer_state not null default 'idle',
  timer_started_at timestamptz,
  timer_remaining  integer,                                                       -- seconds left when paused
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists room_participants (
  id           uuid        primary key default gen_random_uuid(),
  room_id      uuid        not null references study_rooms on delete cascade,
  user_id      uuid        not null references auth.users,
  display_name text,
  joined_at    timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists room_messages (
  id           uuid        primary key default gen_random_uuid(),
  room_id      uuid        not null references study_rooms on delete cascade,
  user_id      uuid        not null references auth.users,
  display_name text,
  content      text        not null check (length(trim(content)) > 0),
  created_at   timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists study_rooms_public_idx    on study_rooms(is_public, created_at desc);
create index if not exists participants_room_id_idx  on room_participants(room_id);
create index if not exists messages_room_created_idx on room_messages(room_id, created_at);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists study_rooms_updated_at on study_rooms;
create trigger study_rooms_updated_at
  before update on study_rooms
  for each row execute function update_updated_at();

-- ─── Row-Level Security ──────────────────────────────────────────────────────

alter table study_rooms      enable row level security;
alter table room_participants enable row level security;
alter table room_messages     enable row level security;

-- study_rooms
create policy "Public rooms viewable by auth users"
  on study_rooms for select to authenticated
  using (is_public or owner_id = auth.uid());

create policy "Auth users can create rooms"
  on study_rooms for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Owner can update room"
  on study_rooms for update to authenticated
  using (owner_id = auth.uid());

create policy "Owner can delete room"
  on study_rooms for delete to authenticated
  using (owner_id = auth.uid());

-- room_participants
create policy "Participants viewable by auth users"
  on room_participants for select to authenticated
  using (true);

create policy "Auth users can join"
  on room_participants for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users update own presence"
  on room_participants for update to authenticated
  using (user_id = auth.uid());

create policy "Users can leave"
  on room_participants for delete to authenticated
  using (user_id = auth.uid());

-- room_messages
create policy "Messages viewable by auth users"
  on room_messages for select to authenticated
  using (true);

create policy "Auth users can send messages"
  on room_messages for insert to authenticated
  with check (user_id = auth.uid());

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable via Supabase Dashboard → Database → Replication → Tables
-- Toggle ON: study_rooms, room_participants, room_messages
