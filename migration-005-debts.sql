-- Catetin migration 005: debt / IOU tracking
-- Run this once in your EXISTING Supabase project's SQL Editor.
-- Safe to re-run.

-- Debts are deliberately kept OUT of the transactions table: lending money
-- out isn't really an expense (it's coming back), so counting it in the
-- Monthly Recap would make an ordinary month look like a blowout. Account
-- balances and the recap stay untouched by a debt; only an actual repayment
-- can optionally write a real transaction (see debt_payments.transaction_id).
create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null,
  direction text not null default 'owed_to_me' check (direction in ('owed_to_me','i_owe')),
  amount numeric not null check (amount > 0),
  note text,
  occurred_at date not null default current_date,
  due_date date,
  payment_source text,
  created_at timestamptz not null default now()
);

-- One row per repayment, so a debt can be settled in instalments. Whether a
-- debt is "settled" is derived from these summing to >= debts.amount rather
-- than stored, so the two can never drift apart.
create table if not exists debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references debts(id) on delete cascade,
  amount numeric not null check (amount > 0),
  paid_at date not null default current_date,
  payment_source text,
  transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_debts_user on debts (user_id, direction);
create index if not exists idx_debt_payments_debt on debt_payments (debt_id);

alter table debts enable row level security;
alter table debt_payments enable row level security;

drop policy if exists "own debts" on debts;
create policy "own debts" on debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own debt payments" on debt_payments;
create policy "own debt payments" on debt_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
