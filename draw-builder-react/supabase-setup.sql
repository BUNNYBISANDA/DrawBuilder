-- Run this once in your Supabase project's SQL Editor
-- (Project -> SQL Editor -> New query -> paste -> Run)
--
-- If you already have a `tournaments` table from an earlier version of
-- this app (the "anyone with the link can edit" model), skip to the
-- MIGRATION section below instead of running the CREATE TABLE block.

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null default '{}'::jsonb,
  name text not null default 'Untitled tournament',
  owner_id uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table tournaments enable row level security;

-- Account model: every tournament has an owner (whoever created it).
-- Watch links stay public (no login) — only editing requires being
-- signed in as the owner.
drop policy if exists "public read" on tournaments;
drop policy if exists "public insert" on tournaments;
drop policy if exists "public update" on tournaments;
drop policy if exists "owner insert" on tournaments;
drop policy if exists "owner update" on tournaments;

create policy "public read" on tournaments
  for select using (true);

create policy "owner insert" on tournaments
  for insert to authenticated
  with check (owner_id = auth.uid());

-- "owner_id is null" lets a signed-in user claim a legacy tournament
-- (created before accounts existed) by setting themselves as its owner —
-- this is how an existing edit link keeps working: open it while signed
-- in and the app claims it for you automatically, once.
create policy "owner update" on tournaments
  for update to authenticated
  using (owner_id is null or owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Enable realtime so other open tabs/devices see live updates.
alter publication supabase_realtime add table tournaments;


-- =====================================================================
-- MIGRATION — run this instead if `tournaments` already exists from the
-- old no-login version. Safe to run once; every statement is idempotent.
-- =====================================================================
--
-- alter table tournaments add column if not exists name text not null default 'Untitled tournament';
-- alter table tournaments add column if not exists owner_id uuid references auth.users(id);
--
-- drop policy if exists "public read" on tournaments;
-- drop policy if exists "public insert" on tournaments;
-- drop policy if exists "public update" on tournaments;
-- drop policy if exists "owner insert" on tournaments;
-- drop policy if exists "owner update" on tournaments;
--
-- create policy "public read" on tournaments
--   for select using (true);
--
-- create policy "owner insert" on tournaments
--   for insert to authenticated
--   with check (owner_id = auth.uid());
--
-- create policy "owner update" on tournaments
--   for update to authenticated
--   using (owner_id is null or owner_id = auth.uid())
--   with check (owner_id = auth.uid());
--
-- After running this, every tournament created before today has
-- owner_id = null (unclaimed). Sign up in the app, then open your
-- existing edit link (e.g. .../?t=ad9e22b4-3cfe-428e-beab-4eadb1fe42c4)
-- while signed in — the app claims it for your account automatically,
-- the first time you open it. Do this before anyone else does, since
-- whoever opens it first while signed in becomes the owner.


