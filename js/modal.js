window.Catetin = window.Catetin || {};

// iOS Safari silently no-ops window.alert/confirm/prompt when the app runs
// standalone (Add to Home Screen), so all confirmation/input dialogs go through
// this instead.
Catetin.modal = {};

Catetin.ICON_CHOICES = ['🍜', '🍔', '☕', '🛒', '🛍️', '👗', '🏠', '💡', '🧾', '🚗', '🛵', '🚌', '✈️', '🧳', '🏖️', '🎉', '🎮', '🎬', '📚', '💊', '🏥', '💇', '🐾', '🎁', '💼', '📥', '💰', '📱', '🎓', '⚽', '🧴', '🔧', '📦'];

Catetin.modal._onBackdropCancel = null;

Catetin.modal._show = function (innerHtml, onBackdropCancel) {
  var overlay = document.getElementById('modal-overlay');
  var sheet = document.getElementById('modal-sheet');
  sheet.innerHTML = innerHtml;
  overlay.hidden = false;
  Catetin.modal._onBackdropCancel = onBackdropCancel || null;
  return sheet;
};

Catetin.modal._hide = function () {
  document.getElementById('modal-overlay').hidden = true;
  Catetin.modal._onBackdropCancel = null;
};

document.getElementById('modal-overlay').addEventListener('click', function (e) {
  if (e.target !== this) return;
  var cancel = Catetin.modal._onBackdropCancel;
  Catetin.modal._hide();
  if (cancel) cancel();
});

Catetin.modal.confirm = function (opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var sheet = Catetin.modal._show(
      '<p class="modal-title">' + Catetin.escapeHtml(opts.title || 'Are you sure?') + '</p>'
      + (opts.message ? '<p class="modal-msg">' + Catetin.escapeHtml(opts.message) + '</p>' : '')
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Cancel</button>'
      + '<button type="button" class="cta' + (opts.danger ? '' : ' mint') + '" id="modal-ok"' + (opts.danger ? ' style="background:var(--coral);color:#fff;"' : '') + '>' + Catetin.escapeHtml(opts.confirmLabel || 'Yes') + '</button>'
      + '</div>',
      function () { resolve(false); }
    );
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(false); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () { Catetin.modal._hide(); resolve(true); });
  });
};

Catetin.modal.prompt = function (opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var sheet = Catetin.modal._show(
      '<p class="modal-title">' + Catetin.escapeHtml(opts.title || '') + '</p>'
      + '<input type="' + (opts.type || 'text') + '" id="modal-input" class="modal-input" placeholder="' + Catetin.escapeHtml(opts.placeholder || '') + '" value="' + Catetin.escapeHtml(opts.initialValue || '') + '">'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Cancel</button>'
      + '<button type="button" class="cta" id="modal-ok">' + Catetin.escapeHtml(opts.confirmLabel || 'Save') + '</button>'
      + '</div>',
      function () { resolve(null); }
    );
    var input = sheet.querySelector('#modal-input');
    setTimeout(function () { input.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var v = input.value.trim();
      Catetin.modal._hide();
      resolve(v || null);
    });
  });
};

Catetin.modal.addCategory = function () {
  return new Promise(function (resolve) {
    var selected = Catetin.ICON_CHOICES[0];
    var sheet = Catetin.modal._show(
      '<p class="modal-title">New Category</p>'
      + '<input type="text" id="modal-cat-name" class="modal-input" placeholder="e.g. Pets">'
      + '<div class="icon-picker" id="modal-icon-picker">'
      + Catetin.ICON_CHOICES.map(function (ic, i) { return '<button type="button" data-icon="' + ic + '" class="' + (i === 0 ? 'active' : '') + '">' + ic + '</button>'; }).join('')
      + '</div>'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Cancel</button>'
      + '<button type="button" class="cta" id="modal-ok">Add</button>'
      + '</div>',
      function () { resolve(null); }
    );
    sheet.querySelectorAll('#modal-icon-picker button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sheet.querySelectorAll('#modal-icon-picker button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selected = btn.dataset.icon;
      });
    });
    var nameInput = sheet.querySelector('#modal-cat-name');
    setTimeout(function () { nameInput.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      Catetin.modal._hide();
      resolve({ name: name, icon: selected });
    });
  });
};

Catetin.modal.editCategory = function (cat) {
  return new Promise(function (resolve) {
    var selected = cat.icon;
    var sheet = Catetin.modal._show(
      '<p class="modal-title">Edit Category</p>'
      + '<input type="text" id="modal-cat-name" class="modal-input" value="' + Catetin.escapeHtml(cat.name) + '" placeholder="Category name">'
      + '<div class="icon-picker" id="modal-icon-picker">'
      + Catetin.ICON_CHOICES.map(function (ic) { return '<button type="button" data-icon="' + ic + '" class="' + (ic === selected ? 'active' : '') + '">' + ic + '</button>'; }).join('')
      + '</div>'
      + '<input type="number" id="modal-cat-budget" class="modal-input" placeholder="Monthly budget (optional)" value="' + (cat.budget_monthly || '') + '" min="0" step="1000">'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Cancel</button>'
      + '<button type="button" class="cta" id="modal-ok">Save</button>'
      + '</div>',
      function () { resolve(null); }
    );
    sheet.querySelectorAll('#modal-icon-picker button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sheet.querySelectorAll('#modal-icon-picker button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selected = btn.dataset.icon;
      });
    });
    var nameInput = sheet.querySelector('#modal-cat-name');
    setTimeout(function () { nameInput.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      var budgetVal = sheet.querySelector('#modal-cat-budget').value;
      Catetin.modal._hide();
      resolve({ name: name, icon: selected, budget_monthly: budgetVal ? Number(budgetVal) : null });
    });
  });
};

Catetin.modal.editAccount = function (acct) {
  return new Promise(function (resolve) {
    var kind = acct.kind;
    var color = acct.color;
    var kinds = [['bank', '🏦 Bank'], ['ewallet', '📱 E-wallet'], ['cash', '💵 Cash'], ['credit_card', '💳 Credit Card']];
    var colors = ['lavender', 'mint', 'yellow', 'pink', 'coral'];
    var sheet = Catetin.modal._show(
      '<p class="modal-title">Edit Account</p>'
      + '<input type="text" id="modal-acct-name" class="modal-input" value="' + Catetin.escapeHtml(acct.name) + '" placeholder="Bank/wallet name">'
      + '<div class="chip-row" id="modal-acct-kind" style="margin-bottom:16px;">'
      + kinds.map(function (k) { return '<button type="button" class="chip' + (k[0] === kind ? ' active' : '') + '" data-kind="' + k[0] + '">' + k[1] + '</button>'; }).join('')
      + '</div>'
      + '<input type="text" id="modal-acct-number" class="modal-input" value="' + Catetin.escapeHtml(acct.account_number || '') + '" placeholder="Account/card number (optional)">'
      + '<input type="number" id="modal-acct-balance" class="modal-input" value="' + Number(acct.initial_balance) + '" placeholder="Starting balance">'
      + '<div class="color-pick" id="modal-acct-color" style="margin-bottom:16px;">'
      + colors.map(function (c) { return '<button type="button" class="swatch' + (c === color ? ' active' : '') + '" data-color="' + c + '" style="background:var(--' + c + ');"></button>'; }).join('')
      + '</div>'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Cancel</button>'
      + '<button type="button" class="cta" id="modal-ok">Save</button>'
      + '</div>',
      function () { resolve(null); }
    );
    sheet.querySelectorAll('#modal-acct-kind .chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sheet.querySelectorAll('#modal-acct-kind .chip').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        kind = btn.dataset.kind;
      });
    });
    sheet.querySelectorAll('#modal-acct-color .swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sheet.querySelectorAll('#modal-acct-color .swatch').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        color = btn.dataset.color;
      });
    });
    var nameInput = sheet.querySelector('#modal-acct-name');
    setTimeout(function () { nameInput.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      var number = sheet.querySelector('#modal-acct-number').value.trim();
      var balance = Number(sheet.querySelector('#modal-acct-balance').value || 0);
      Catetin.modal._hide();
      resolve({ name: name, kind: kind, account_number: number || null, initial_balance: balance, color: color });
    });
  });
};

Catetin.modal.editTrip = function (trip) {
  return new Promise(function (resolve) {
    var selected = trip.icon;
    var sheet = Catetin.modal._show(
      '<p class="modal-title">Edit Event</p>'
      + '<input type="text" id="modal-trip-name" class="modal-input" value="' + Catetin.escapeHtml(trip.name) + '" placeholder="Event name">'
      + '<div class="icon-picker" id="modal-icon-picker">'
      + Catetin.ICON_CHOICES.map(function (ic) { return '<button type="button" data-icon="' + ic + '" class="' + (ic === selected ? 'active' : '') + '">' + ic + '</button>'; }).join('')
      + '</div>'
      + '<div class="row" style="gap:10px;">'
      + '<input type="date" id="modal-trip-start" class="modal-input" value="' + (trip.start_date || '') + '" style="flex:1;">'
      + '<input type="date" id="modal-trip-end" class="modal-input" value="' + (trip.end_date || '') + '" style="flex:1;">'
      + '</div>'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Cancel</button>'
      + '<button type="button" class="cta" id="modal-ok">Save</button>'
      + '</div>',
      function () { resolve(null); }
    );
    sheet.querySelectorAll('#modal-icon-picker button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sheet.querySelectorAll('#modal-icon-picker button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selected = btn.dataset.icon;
      });
    });
    var nameInput = sheet.querySelector('#modal-trip-name');
    setTimeout(function () { nameInput.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      var start = sheet.querySelector('#modal-trip-start').value || null;
      var end = sheet.querySelector('#modal-trip-end').value || null;
      Catetin.modal._hide();
      resolve({ name: name, icon: selected, start_date: start, end_date: end });
    });
  });
};

Catetin.modal.editTransaction = function (t) {
  return new Promise(function (resolve) {
    var currentType = t.type;
    function categoryOptions(type) {
      return Catetin.state.categories.filter(function (c) { return c.type === type; })
        .map(function (c) { return '<option value="' + Catetin.escapeHtml(c.name) + '"' + (c.name === t.category ? ' selected' : '') + '>' + c.icon + ' ' + Catetin.escapeHtml(c.name) + '</option>'; }).join('');
    }
    var acctOptions = Catetin.state.accounts.map(function (a) { return '<option value="' + Catetin.escapeHtml(a.name) + '"' + (a.name === t.payment_source ? ' selected' : '') + '>' + Catetin.escapeHtml(a.name) + '</option>'; }).join('');
    var tripOptions = '<option value="">General</option>' + Catetin.state.trips.map(function (tr) { return '<option value="' + tr.id + '"' + (tr.id === t.trip_id ? ' selected' : '') + '>' + tr.icon + ' ' + Catetin.escapeHtml(tr.name) + '</option>'; }).join('');

    var sheet = Catetin.modal._show(
      '<p class="modal-title">Edit Transaction</p>'
      + '<div class="toggle" id="modal-txn-type" style="margin-bottom:14px;">'
      + '<button type="button" class="opt' + (t.type === 'expense' ? ' active' : '') + '" data-type="expense" style="' + (t.type === 'expense' ? 'color:var(--coral-ink);' : '') + '">Expense</button>'
      + '<button type="button" class="opt' + (t.type === 'income' ? ' active' : '') + '" data-type="income" style="' + (t.type === 'income' ? 'color:var(--mint-ink);' : '') + '">Income</button>'
      + '</div>'
      + '<input type="number" id="modal-amt" class="modal-input" value="' + Number(t.amount) + '" placeholder="Amount">'
      + '<select id="modal-cat" class="modal-input">' + categoryOptions(t.type) + '</select>'
      + '<select id="modal-acct" class="modal-input">' + acctOptions + '</select>'
      + '<input type="date" id="modal-date" class="modal-input" value="' + t.occurred_at + '">'
      + '<select id="modal-trip" class="modal-input">' + tripOptions + '</select>'
      + '<input type="text" id="modal-note" class="modal-input" value="' + Catetin.escapeHtml(t.note || '') + '" placeholder="Note (optional)">'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Cancel</button>'
      + '<button type="button" class="cta" id="modal-ok">Save</button>'
      + '</div>',
      function () { resolve(null); }
    );

    var catSelect = sheet.querySelector('#modal-cat');
    sheet.querySelectorAll('#modal-txn-type .opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentType = btn.dataset.type;
        sheet.querySelectorAll('#modal-txn-type .opt').forEach(function (b) { b.classList.remove('active'); b.style.color = ''; });
        btn.classList.add('active');
        btn.style.color = currentType === 'expense' ? 'var(--coral-ink)' : 'var(--mint-ink)';
        catSelect.innerHTML = categoryOptions(currentType);
      });
    });

    var amtInput = sheet.querySelector('#modal-amt');
    setTimeout(function () { amtInput.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var amount = Number(amtInput.value);
      if (!amount || amount <= 0) { amtInput.focus(); return; }
      var category = catSelect.value;
      var account = sheet.querySelector('#modal-acct').value;
      var date = sheet.querySelector('#modal-date').value;
      if (!category || !account || !date) { return; }
      var tripId = sheet.querySelector('#modal-trip').value || null;
      var note = sheet.querySelector('#modal-note').value.trim();
      Catetin.modal._hide();
      resolve({ type: currentType, amount: amount, category: category, payment_source: account, occurred_at: date, trip_id: tripId, note: note || null });
    });
  });
};
