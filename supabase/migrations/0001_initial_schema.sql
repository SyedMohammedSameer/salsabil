-- ============================================================
-- Salsabil V1 Initial Schema
-- ============================================================
-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Helper: updated_at trigger ──────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique,
  display_name  text,
  avatar_url    text,
  timezone      text not null default 'UTC',
  onboarded     boolean not null default false,
  coins         integer not null default 0 check (coins >= 0),
  streak        integer not null default 0,
  longest_streak integer not null default 0,
  last_active   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Prayers ─────────────────────────────────────────────────
create type public.prayer_name as enum
  ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'tahajjud');

create type public.prayer_status as enum
  ('prayed', 'missed', 'late', 'qada');

create table public.prayers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  date        date not null,
  prayer      prayer_name not null,
  status      prayer_status,
  prayed_at   timestamptz,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (user_id, date, prayer)
);
create index prayers_user_date_idx on public.prayers(user_id, date desc);

-- ─── Quran logs ──────────────────────────────────────────────
create table public.quran_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  date          date not null,
  surah_from    smallint not null check (surah_from between 1 and 114),
  ayah_from     smallint not null,
  surah_to      smallint not null check (surah_to between 1 and 114),
  ayah_to       smallint not null,
  pages_read    numeric(5,1) not null default 0,
  duration_mins smallint,
  notes         text,
  created_at    timestamptz not null default now()
);
create index quran_logs_user_date_idx on public.quran_logs(user_id, date desc);

-- ─── Adhkar ──────────────────────────────────────────────────
create type public.adhkar_time as enum ('morning', 'evening', 'after_prayer', 'other');

create table public.adhkar_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  date        date not null,
  time        adhkar_time not null default 'other',
  completed   boolean not null default false,
  completed_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, date, time)
);

-- ─── Tasks ───────────────────────────────────────────────────
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_recurrence as enum ('none', 'daily', 'weekly', 'monthly');

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  priority      task_priority not null default 'medium',
  due_date      date,
  due_time      time,
  completed     boolean not null default false,
  completed_at  timestamptz,
  recurrence    task_recurrence not null default 'none',
  tags          text[] not null default '{}',
  order_index   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.handle_updated_at();
create index tasks_user_due_idx on public.tasks(user_id, due_date);
create index tasks_user_completed_idx on public.tasks(user_id, completed);

-- ─── Focus sessions ──────────────────────────────────────────
create type public.session_type as enum ('pomodoro', 'short_break', 'long_break', 'flow');

create table public.focus_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            session_type not null default 'pomodoro',
  duration_mins   smallint not null check (duration_mins > 0),
  completed       boolean not null default false,
  task_id         uuid references public.tasks(id) on delete set null,
  coins_earned    smallint not null default 0,
  started_at      timestamptz not null,
  ended_at        timestamptz,
  created_at      timestamptz not null default now()
);
create index focus_sessions_user_idx on public.focus_sessions(user_id, started_at desc);

-- ─── Garden / Trees ──────────────────────────────────────────
create type public.tree_species as enum (
  'olive', 'date_palm', 'cedar', 'lote', 'fig',
  'pomegranate', 'acacia', 'sakura', 'oak', 'pine',
  'banyan', 'baobab'
);

create type public.tree_stage as enum
  ('seed', 'sprout', 'sapling', 'young', 'mature', 'ancient');

create table public.garden_trees (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  species     tree_species not null,
  name        text,
  stage       tree_stage not null default 'seed',
  xp          integer not null default 0 check (xp >= 0),
  planted_at  timestamptz not null default now(),
  last_watered_at timestamptz,
  position_x  numeric(5,2) not null default 0,
  position_y  numeric(5,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger garden_trees_updated_at
  before update on public.garden_trees
  for each row execute function public.handle_updated_at();

-- ─── Workouts ────────────────────────────────────────────────
create type public.workout_type as enum
  ('strength', 'cardio', 'flexibility', 'sports', 'walk', 'other');

create table public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          workout_type not null,
  title         text not null,
  duration_mins smallint not null check (duration_mins > 0),
  notes         text,
  date          date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger workouts_updated_at
  before update on public.workouts
  for each row execute function public.handle_updated_at();
create index workouts_user_date_idx on public.workouts(user_id, date desc);

-- ─── Challenges ──────────────────────────────────────────────
create type public.challenge_status as enum ('active', 'completed', 'failed', 'paused');

create table public.challenges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  target_days   smallint not null check (target_days > 0),
  current_days  smallint not null default 0,
  status        challenge_status not null default 'active',
  start_date    date not null,
  end_date      date,
  category      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger challenges_updated_at
  before update on public.challenges
  for each row execute function public.handle_updated_at();

-- ─── Achievements ────────────────────────────────────────────
create table public.achievements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  unlocked_at   timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- ─── Coin transactions ───────────────────────────────────────
create type public.coin_action as enum (
  'focus_complete', 'prayer_logged', 'quran_page', 'task_complete',
  'workout_logged', 'challenge_complete', 'adhkar_complete',
  'streak_bonus', 'tree_purchase', 'achievement_bonus'
);

create table public.coin_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  action      coin_action not null,
  amount      integer not null,
  balance     integer not null,
  description text,
  created_at  timestamptz not null default now()
);
create index coin_tx_user_idx on public.coin_transactions(user_id, created_at desc);

-- ─── AI chat history ─────────────────────────────────────────
create type public.chat_role as enum ('user', 'assistant', 'system');

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        chat_role not null,
  content     text not null,
  model       text,
  tokens      integer,
  created_at  timestamptz not null default now()
);
create index chat_messages_user_idx on public.chat_messages(user_id, created_at desc);

-- ─── Notifications ───────────────────────────────────────────
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  read        boolean not null default false,
  action_url  text,
  created_at  timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications(user_id, read, created_at desc);

-- ─── Row Level Security ──────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.prayers           enable row level security;
alter table public.quran_logs        enable row level security;
alter table public.adhkar_logs       enable row level security;
alter table public.tasks             enable row level security;
alter table public.focus_sessions    enable row level security;
alter table public.garden_trees      enable row level security;
alter table public.workouts          enable row level security;
alter table public.challenges        enable row level security;
alter table public.achievements      enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.chat_messages     enable row level security;
alter table public.notifications     enable row level security;

-- Profiles: users can read/update their own row only
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- Generic own-data policies for all user tables
do $$ declare t text; begin
  foreach t in array array[
    'prayers', 'quran_logs', 'adhkar_logs', 'tasks', 'focus_sessions',
    'garden_trees', 'workouts', 'challenges', 'achievements',
    'coin_transactions', 'chat_messages', 'notifications'
  ] loop
    execute format(
      'create policy "%s: own select" on public.%s for select using (auth.uid() = user_id)',
      t, t
    );
    execute format(
      'create policy "%s: own insert" on public.%s for insert with check (auth.uid() = user_id)',
      t, t
    );
    execute format(
      'create policy "%s: own update" on public.%s for update using (auth.uid() = user_id)',
      t, t
    );
    execute format(
      'create policy "%s: own delete" on public.%s for delete using (auth.uid() = user_id)',
      t, t
    );
  end loop;
end $$;

-- ─── Daily coin cap enforcement ──────────────────────────────
-- Prevent gaming: max coins per action type per day
create or replace function public.check_daily_coin_cap()
returns trigger language plpgsql security definer as $$
declare
  daily_cap integer;
  earned_today integer;
begin
  -- Per-action daily caps
  daily_cap := case new.action
    when 'focus_complete'      then 100
    when 'prayer_logged'       then 60
    when 'quran_page'          then 40
    when 'task_complete'       then 50
    when 'workout_logged'      then 30
    when 'challenge_complete'  then 200
    when 'adhkar_complete'     then 20
    when 'streak_bonus'        then 50
    else 9999
  end;

  select coalesce(sum(amount), 0) into earned_today
  from public.coin_transactions
  where user_id = new.user_id
    and action  = new.action
    and amount  > 0
    and created_at >= current_date::timestamptz;

  if new.amount > 0 and earned_today + new.amount > daily_cap then
    new.amount := greatest(0, daily_cap - earned_today);
  end if;

  return new;
end;
$$;

create trigger enforce_daily_coin_cap
  before insert on public.coin_transactions
  for each row execute function public.check_daily_coin_cap();

-- Keep profile.coins in sync with transactions
create or replace function public.sync_coin_balance()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
  set coins = coins + new.amount
  where id = new.user_id;
  return new;
end;
$$;

create trigger sync_coins_after_tx
  after insert on public.coin_transactions
  for each row execute function public.sync_coin_balance();

-- ─── Streak update on prayer log ─────────────────────────────
create or replace function public.update_streak_on_prayer()
returns trigger language plpgsql security definer as $$
declare
  yesterday_count integer;
begin
  if new.status = 'prayed' then
    select count(*) into yesterday_count
    from public.prayers
    where user_id = new.user_id
      and date = new.date - interval '1 day'
      and status = 'prayed';

    if yesterday_count > 0 then
      update public.profiles
      set streak = streak + 1,
          longest_streak = greatest(longest_streak, streak + 1),
          last_active = new.date
      where id = new.user_id;
    else
      update public.profiles
      set streak = 1,
          last_active = new.date
      where id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger prayer_streak_update
  after insert or update on public.prayers
  for each row execute function public.update_streak_on_prayer();

-- ─── Indexes for analytics queries ───────────────────────────
create index prayers_streak_idx on public.prayers(user_id, date, status);

-- ─── Storage buckets ─────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('garden_assets', 'garden_assets', false)
on conflict do nothing;

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: own upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: own delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
