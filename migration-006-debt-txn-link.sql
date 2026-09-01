-- Catetin migration 006: link a debt back to the transaction that created it
-- Run this once in your EXISTING Supabase project's SQL Editor.
-- Safe to re-run.

-- Set when a debt is created straight from the Add flow ("I paid for this,
-- they owe me back"). The transaction is the real money leaving/entering the
-- account; the debt is the promise attached to it. on delete set null so
-- deleting the transaction never silently wipes out the fact you're owed.
alter table debts add column if not exists transaction_id uuid references transactions(id) on delete set null;
