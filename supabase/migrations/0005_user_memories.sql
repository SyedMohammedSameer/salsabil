-- Long-term memory store for Noor AI.
-- Each row is one durable fact / preference / goal about the user that Noor
-- carries across all conversations.

create table public.user_memories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 500),
  kind        text not null default 'fact'
                  check (kind in ('fact', 'preference', 'goal', 'context')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index user_memories_user_idx
  on public.user_memories(user_id, created_at desc);

alter table public.user_memories enable row level security;

create policy "user_memories_select_own"
  on public.user_memories for select
  using (auth.uid() = user_id);

create policy "user_memories_insert_own"
  on public.user_memories for insert
  with check (auth.uid() = user_id);

create policy "user_memories_update_own"
  on public.user_memories for update
  using (auth.uid() = user_id);

create policy "user_memories_delete_own"
  on public.user_memories for delete
  using (auth.uid() = user_id);
