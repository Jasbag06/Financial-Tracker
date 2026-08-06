-- Catetin migration 002: iOS Shortcuts quick-add integration
-- Run this once in your EXISTING Supabase project's SQL Editor.
-- Safe to re-run (uses if-not-exists / or-replace).

-- ============ SHORTCUT TOKENS ============
-- One long random per-user secret, separate from your password and from the
-- Supabase anon key (which is public by design). Shortcuts sends this token
-- to prove which account a quick-add belongs to. If it ever leaks, the only
-- thing someone can do with it is insert fake transactions into your own
-- history - they can't read, edit, or delete anything, and can't sign in as
-- you. Regenerate it any time from Settings -> Shortcut Token in the app.
create table if not exists shortcut_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

alter table shortcut_tokens enable row level security;

drop policy if exists "own shortcut tokens" on shortcut_tokens;
create policy "own shortcut tokens" on shortcut_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============ QUICK ADD RPC ============
-- security definer so it can run without a logged-in session (Shortcuts only
-- sends the public anon key, never your password or a session token). It does
-- its own authorization by resolving the token to a user_id first - nothing
-- below that point trusts anything else the caller sends.
create or replace function quick_add_transaction(
  secret text,
  type text,
  amount numeric,
  category text,
  payment_method text,
  note text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_cat_exists boolean;
  v_acct_exists boolean;
begin
  select user_id into v_user_id from shortcut_tokens where token = secret;
  if v_user_id is null then
    return json_build_object('success', false, 'message', 'Invalid token');
  end if;

  if type not in ('expense', 'income') then
    return json_build_object('success', false, 'message', 'Type must be expense or income');
  end if;

  if amount is null or amount <= 0 then
    return json_build_object('success', false, 'message', 'Amount must be greater than 0');
  end if;

  select exists(
    select 1 from categories
    where user_id = v_user_id and name = category and categories.type = quick_add_transaction.type
  ) into v_cat_exists;
  if not v_cat_exists then
    return json_build_object('success', false, 'message', 'Unknown category: ' || category);
  end if;

  select exists(
    select 1 from payment_sources where user_id = v_user_id and name = payment_method
  ) into v_acct_exists;
  if not v_acct_exists then
    return json_build_object('success', false, 'message', 'Unknown payment method: ' || payment_method);
  end if;

  insert into transactions (user_id, occurred_at, type, amount, category, payment_source, note, is_recurring)
  values (v_user_id, (now() at time zone 'Asia/Jakarta')::date, type, amount, category, payment_method, note, false);

  return json_build_object('success', true, 'message', 'Saved');
end;
$$;

revoke all on function quick_add_transaction(text, text, numeric, text, text, text) from public;
grant execute on function quick_add_transaction(text, text, numeric, text, text, text) to anon;
