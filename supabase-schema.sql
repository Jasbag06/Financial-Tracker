-- Catetin: personal finance tracker schema
-- Run this in Supabase SQL Editor (Project -> SQL Editor -> New query)

create extension if not exists "pgcrypto";

-- ============ CATEGORIES ============
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense','income')),
  icon text not null default '💸',
  budget_monthly numeric,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

-- ============ PAYMENT SOURCES ============
create table if not exists payment_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'cash' check (kind in ('cash','bank','ewallet','credit_card','other')),
  initial_balance numeric not null default 0,
  account_number text,
  color text not null default 'lavender' check (color in ('lavender','mint','yellow','pink','coral')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ============ TRIPS / ACARA ============
-- Optional tag to group transactions around a trip or event (e.g. "Pergi ke Bandung"),
-- separate from the day-to-day "Umum" bucket. Kept as a nullable tag on transactions
-- rather than a separate ledger, so totals/budgets/history still see everything.
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '🧳',
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- ============ TRANSACTIONS ============
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at date not null default current_date,
  type text not null check (type in ('expense','income')),
  amount numeric not null check (amount > 0),
  category text not null,
  payment_source text not null,
  note text,
  is_recurring boolean not null default false,
  trip_id uuid references trips(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_date on transactions (user_id, occurred_at desc);
create index if not exists idx_transactions_trip on transactions (trip_id);

-- ============ ROW LEVEL SECURITY ============
alter table categories enable row level security;
alter table payment_sources enable row level security;
alter table trips enable row level security;
alter table transactions enable row level security;

create policy "own categories" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own payment sources" on payment_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own trips" on trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ SEED DEFAULTS (run once, replace YOUR_USER_ID) ============
-- Get your user id after first login: select id from auth.users;
-- insert into categories (user_id, name, type, icon, sort_order) values
--   ('YOUR_USER_ID','Makan & Minum','expense','🍜',1),
--   ('YOUR_USER_ID','Transport','expense','🛵',2),
--   ('YOUR_USER_ID','Belanja','expense','🛍️',3),
--   ('YOUR_USER_ID','Tagihan','expense','🧾',4),
--   ('YOUR_USER_ID','Hiburan','expense','🎮',5),
--   ('YOUR_USER_ID','Kesehatan','expense','💊',6),
--   ('YOUR_USER_ID','Lainnya','expense','📦',7),
--   ('YOUR_USER_ID','Gaji','income','💼',1),
--   ('YOUR_USER_ID','Bonus','income','🎁',2),
--   ('YOUR_USER_ID','Lainnya','income','📥',3);
-- insert into payment_sources (user_id, name, kind, initial_balance, color, sort_order) values
--   ('YOUR_USER_ID','Cash','cash',0,'pink',1),
--   ('YOUR_USER_ID','Debit BCA','bank',0,'lavender',2),
--   ('YOUR_USER_ID','GoPay','ewallet',0,'yellow',3),
--   ('YOUR_USER_ID','OVO','ewallet',0,'coral',4);
