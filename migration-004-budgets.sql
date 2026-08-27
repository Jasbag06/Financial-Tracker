-- Catetin migration 004: event-first category budgets
-- Run this once in your EXISTING Supabase project's SQL Editor.
-- Safe to re-run.

-- Replaces the old flat "budget per category" (categories.budget_monthly,
-- now unused) with budgets scoped to an Event first, then a category within
-- it - so "Trip Bandung" and everyday "General" spending can each have their
-- own budget for the same category. trip_id = null means "General" (resets
-- every month); a trip-scoped budget covers the whole event.
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references trips(id) on delete cascade,
  category text not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- A plain unique(user_id, trip_id, category) wouldn't stop duplicate
-- "General" budgets for the same category, since Postgres treats every
-- null trip_id as distinct - so General and event-scoped budgets each get
-- their own partial unique index instead.
create unique index if not exists budgets_unique_event on budgets (user_id, trip_id, category) where trip_id is not null;
create unique index if not exists budgets_unique_general on budgets (user_id, category) where trip_id is null;

alter table budgets enable row level security;

drop policy if exists "own budgets" on budgets;
create policy "own budgets" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
