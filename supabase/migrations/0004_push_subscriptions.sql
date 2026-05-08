-- Push subscriptions for Web Push API
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- In-app notifications
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  read        boolean not null default false,
  action_url  text,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users manage own notifications"
  on public.notifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists notifications_user_unread
  on public.notifications(user_id, read, created_at desc);

-- Enable realtime for notifications
alter publication supabase_realtime add table public.notifications;
