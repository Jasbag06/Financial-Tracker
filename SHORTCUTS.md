# iOS Shortcuts quick-add integration

Add a transaction to Financial Tracker without opening the app — trigger it with a
double-tap on the back of your iPhone (Back Tap), fill in 3-4 quick menus, done.

## How it's secured

Shortcuts can't log in with your email/password, and the Supabase **anon key**
is public by design (it's already embedded in the app's own source code — that's
normal for Supabase apps, it's meant to be combined with Row Level Security, not
kept secret). So the anon key alone can't insert anything into your account.

Instead, this uses a second, separate secret: your **Shortcut Token** — a long
random string, different from your password, that only this one Shortcut knows.
It's checked by a database function (`quick_add_transaction`) that:

- Looks up which account the token belongs to (invalid token → rejected, nothing happens)
- Only allows `type` to be `expense` or `income`
- Only allows `amount` greater than 0
- Only allows a `category` / `payment_method` that already exists in **your**
  account (typos or made-up values are rejected, not silently inserted)
- Always writes the row under **your** `user_id` — it can never write to anyone else's data
- Can only ever INSERT a transaction — no read, update, or delete access to anything

So if the token ever leaked, the worst case is someone could add junk expense
rows to your own history (annoying, easily deleted) — not read your data, not
touch your other banks, not sign in as you. You can invalidate a leaked token
any time from **Settings → Shortcut Token → Regenerate**, which instantly
breaks the old Shortcut until you paste in the new one.

## Setup

### 1. Run the database migration

In Supabase → **SQL Editor → New query**, paste the contents of
[`migration-002-shortcuts.sql`](migration-002-shortcuts.sql) and Run. This adds
the `shortcut_tokens` table and the `quick_add_transaction` function — safe to
run even if you already ran earlier migrations.

### 2. Get your Shortcut Token

In the app: **Settings → Shortcut Token**. It's created automatically the
first time you open that screen. Tap **Copy** — you'll paste this into the
Shortcut in step 5 below.

### 3. Get your exact category & payment method names

The Shortcut's category/payment menus are typed in by hand in the Shortcuts
app (that's just how "Choose from Menu" works), so they need to match your
**actual** category and account names exactly, including whatever you've
renamed or added yourself.

Run this in Supabase SQL Editor to print your real, current lists:

```sql
select icon || ' ' || name as menu_label, type
from categories
where user_id = (select id from auth.users where email = 'YOUR_LOGIN_EMAIL')
order by type, sort_order;

select name as menu_label
from payment_sources
where user_id = (select id from auth.users where email = 'YOUR_LOGIN_EMAIL')
order by sort_order;
```

Replace `YOUR_LOGIN_EMAIL` with the email you use to sign in. Use the printed
`menu_label` values as your Shortcut's menu options — the emoji-prefixed text
(e.g. `🍜 Food & Drink`) is just a label for you to read; only the part after
the emoji (`Food & Drink`) gets sent as `category`, so when you build the
"Choose from Menu" step in Shortcuts, add both an emoji+name option label *and*
know that you'll pass just the name in the request (see step 5 — you can also
just keep the emoji off the menu text entirely if that's simpler).

If you haven't customized anything yet, here's the default set the app ships
with, for reference:

```json
{
  "expense": [
    { "name": "Food & Drink", "icon": "🍜" },
    { "name": "Transport", "icon": "🛵" },
    { "name": "Shopping", "icon": "🛍️" },
    { "name": "Bills", "icon": "🧾" },
    { "name": "Entertainment", "icon": "🎮" },
    { "name": "Health", "icon": "💊" },
    { "name": "Other", "icon": "📦" }
  ],
  "income": [
    { "name": "Salary", "icon": "💼" },
    { "name": "Bonus", "icon": "🎁" },
    { "name": "Other", "icon": "📥" }
  ]
}
```

### 4. The request format

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `https://yivqvcaycueyfeyfgvul.supabase.co/rest/v1/rpc/quick_add_transaction` |
| **Header** | `apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdnF2Y2F5Y3VleWZleWZndnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzY1ODMsImV4cCI6MjEwMTUxMjU4M30.sE2aXOZnUiEHHyjkWNp4Hu3s826t_2BTHEzRX_0HU0k` |
| **Header** | `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpdnF2Y2F5Y3VleWZleWZndnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzY1ODMsImV4cCI6MjEwMTUxMjU4M30.sE2aXOZnUiEHHyjkWNp4Hu3s826t_2BTHEzRX_0HU0k` (same value as apikey) |
| **Header** | `Content-Type: application/json` |
| **Body** (JSON) | `{"secret": "<your Shortcut Token>", "type": "expense", "amount": 345000, "category": "Food & Drink", "payment_method": "Cash", "note": "optional text or omit"}` |

Response body, e.g.:
```json
{ "success": true, "message": "Saved" }
{ "success": false, "message": "Unknown category: Foood" }
```

The date is set automatically to *today* (Jakarta time) on the server — the
request never needs to send a date.

### 5. Build the Shortcut

Open the **Shortcuts** app → **+** → add these actions in order:

1. **Choose from Menu** — Prompt: `Which one?` → add options **Expense**, **Income**.
   *(This creates two branches — repeat steps 2-4 the same way in each branch, they only differ in what gets sent as `type`.)*

2. **Ask for Input** — Input Type: **Number** → Prompt: `Amount?`
   → this gives you the magic variable **Provided Input**, use it later as `amount`.

3. **Choose from Menu** — Prompt: `Category?` → add one option per category
   from step 3 above (e.g. `🍜 Food & Drink`, `🛵 Transport`, …).

4. **Choose from Menu** — Prompt: `Pay with?` → add one option per payment
   method from step 3 above (e.g. `Cash`, `BCA`, `Seabank`).

5. *(Optional)* **Ask for Input** — Input Type: **Text**, allow empty →
   Prompt: `Note? (optional)` → skip this action entirely if you don't want
   notes on quick-added transactions.

6. **Text** action — build the JSON body by typing:
   ```
   {"secret": "PASTE_YOUR_TOKEN_HERE", "type": "expense", "amount": 
   ```
   then insert the **Provided Input** variable from step 2, then continue typing:
   ```
   , "category": "
   ```
   then insert the **Chosen Item** variable from step 3 (category), continue:
   ```
   ", "payment_method": "
   ```
   then insert the **Chosen Item** variable from step 4 (payment), continue:
   ```
   ", "note": "
   ```
   then insert the **Provided Input** variable from step 5 (or leave blank if you skipped it), close with:
   ```
   "}
   ```
   Do this once for the **Expense** branch (with `"type": "expense"`) and once
   for the **Income** branch (with `"type": "income"`) — everything else is
   identical.

   *(If you'd rather not hand-assemble JSON text, Shortcuts' "Get Contents of
   URL" action also has a **Request Body → Form** mode with individual
   key/value fields — same result, sometimes easier to get right.)*

7. **Get Contents of URL**:
   - URL: `https://yivqvcaycueyfeyfgvul.supabase.co/rest/v1/rpc/quick_add_transaction`
   - Method: `POST`
   - Headers: add `apikey`, `Authorization`, `Content-Type` exactly as in the
     table above
   - Request Body: **JSON** → **Field: (none, raw)** — pick "Raw" body mode if
     available and paste in the Text variable from step 6; otherwise select
     the Text action's output directly as the body

8. **Get Dictionary from Input** — from the previous action's result.

9. **Get Value for "success"** (and separately, **Get Value for "message"**)
   from that dictionary.

10. **If** success is `true`:
    - **Show Notification** — Title: `✅ Saved`, Body: category + amount you just entered
    - **Otherwise**: **Show Notification** — Title: `❌ Failed`, Body: the `message` value

Name the Shortcut something like **"Quick Add"**.

### 6. Wire it to Back Tap

**Settings → Accessibility → Touch → Back Tap → Double Tap** (or **Triple
Tap**) → select your **Quick Add** Shortcut. Double-tap the back of your phone
any time — the menus pop up, fill them in, done, no app opens.

## Troubleshooting

- **"Invalid token"** — the `secret` in the request doesn't match your current
  token. Re-copy it from Settings → Shortcut Token (especially after
  regenerating it).
- **"Unknown category: …" / "Unknown payment method: …"** — the text sent
  doesn't exactly match a category/account name in your account (case and
  spelling matter, and it must match the emoji-stripped name, not the full
  `🍜 Food & Drink` label). Re-run the SQL query in step 3 to check the exact
  spelling, or add the category/account in the app first.
- **"Amount must be greater than 0"** — make sure the Ask for Input action in
  step 2 is set to **Number** type, not Text.
- **Nothing happens / no notification** — check Content-Type and both
  `apikey`/`Authorization` headers are present; a missing `apikey` header
  gets rejected before your request ever reaches the function.
