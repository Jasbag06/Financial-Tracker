-- Catetin migration 001: add "Acara" (trips/events) grouping
-- Run this once in your EXISTING Supabase project's SQL Editor.
-- Safe to re-run (uses if-not-exists / add-column-if-not-exists).

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '🧳',
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

alter table transactions add column if not exists trip_id uuid references trips(id) on delete set null;

create index if not exists idx_transactions_trip on transactions (trip_id);

alter table trips enable row level security;

drop policy if exists "own trips" on trips;
create policy "own trips" on trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
