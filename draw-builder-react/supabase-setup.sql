-- Run this once in your Supabase project's SQL Editor
-- (Project -> SQL Editor -> New query -> paste -> Run)

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table tournaments enable row level security;

-- Shareable-link model: anyone with the tournament's link (id) can read
-- and write it. No login required. If you later want organizer-only
-- editing, swap these for policies scoped to an authenticated user.
create policy "public read" on tournaments
  for select using (true);

create policy "public insert" on tournaments
  for insert with check (true);

create policy "public update" on tournaments
  for update using (true);

-- Enable realtime so other open tabs/devices see live updates.
alter publication supabase_realtime add table tournaments;
