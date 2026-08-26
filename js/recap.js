window.Catetin = window.Catetin || {};

Catetin.recap = { month: new Date().toISOString().slice(0, 7), openCat: null, openEvent: null };

Catetin.router.onEnter.recap = function () {
  Catetin.recap.month = new Date().toISOString().slice(0, 7);
  Catetin.recap.openCat = null;
  Catetin.recap.openEvent = null;
  Catetin.renderRecap();
};

Catetin.recap.shiftMonth = function (delta) {
  var parts = Catetin.recap.month.split('-');
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
  Catetin.recap.month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  Catetin.recap.openCat = null;
  Catetin.recap.openEvent = null;
  Catetin.renderRecap();
};

document.getElementById('btn-recap-prev-month').addEventListener('click', function () { Catetin.recap.shiftMonth(-1); });
document.getElementById('btn-recap-next-month').addEventListener('click', function () { Catetin.recap.shiftMonth(1); });

Catetin.renderRecap = function () {
  var monthStr = Catetin.recap.month;
  var parts = monthStr.split('-');
  var labelDate = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  document.getElementById('recap-month-label').textContent = labelDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('btn-recap-next-month').disabled = monthStr >= new Date().toISOString().slice(0, 7);

  var monthTx = Catetin.monthTransactions(monthStr);
  var expenseTx = monthTx.filter(function (t) { return t.type === 'expense'; });
  var incomeTx = monthTx.filter(function (t) { return t.type === 'income'; });
  var income = incomeTx.reduce(function (s, t) { return s + Number(t.amount); }, 0);
  var expense = expenseTx.reduce(function (s, t) { return s + Number(t.amount); }, 0);
  var net = income - expense;

  document.getElementById('recap-income').textContent = Catetin.fmtRp(income);
  document.getElementById('recap-expense').textContent = Catetin.fmtRp(expense);
  var netEl = document.getElementById('recap-net');
  netEl.textContent = (net < 0 ? '-' : '') + Catetin.fmtRp(Math.abs(net));
  netEl.style.color = net < 0 ? 'var(--coral-ink)' : 'var(--mint-ink)';

  Catetin.renderDonut(expenseTx, 'recap-donut-svg', 'recap-donut-legend');
  Catetin.recap.renderCategoryList(expenseTx, expense);
  Catetin.recap.renderEventList(expenseTx, expense);
  Catetin.recap.renderAccountList(expenseTx, expense);

  if (monthTx.length === 0) {
    document.getElementById('recap-txn-list').innerHTML = '<div class="empty-state">No transactions this month</div>';
  } else {
    Catetin.renderTxnGroups('recap-txn-list', monthTx, Catetin.renderRecap);
  }
};

// Full category breakdown (not capped at 5 like the dashboard donut) - each
// row expands in place to show every transaction in that category, so a
// closing-of-the-month review can answer "what was this actually spent on".
Catetin.recap.renderCategoryList = function (expenseTx, total) {
  var byCat = {};
  expenseTx.forEach(function (t) {
    if (!byCat[t.category]) byCat[t.category] = [];
    byCat[t.category].push(t);
  });
  var entries = Object.keys(byCat).map(function (name) {
    var txns = byCat[name];
    return { name: name, txns: txns, amount: txns.reduce(function (s, t) { return s + Number(t.amount); }, 0) };
  }).sort(function (a, b) { return b.amount - a.amount; });

  var container = document.getElementById('recap-cat-list');
  if (entries.length === 0) { container.innerHTML = '<div class="empty-state">No expenses this month</div>'; return; }

  container.innerHTML = entries.map(function (e, i) {
    var cat = Catetin.state.categories.find(function (c) { return c.name === e.name; });
    var icon = cat ? cat.icon : '💸';
    var pct = total > 0 ? Math.round(e.amount / total * 100) : 0;
    var isOpen = Catetin.recap.openCat === e.name;
    return '<div class="txn recap-cat-row' + (isOpen ? ' open' : '') + '" data-recap-cat="' + Catetin.escapeHtml(e.name) + '">'
      + '<div class="icon-chip" style="background:var(--surface-2);">' + icon + '</div>'
      + '<div class="meta"><div class="cat">' + Catetin.escapeHtml(e.name) + '</div><div class="sub">' + e.txns.length + ' transaction' + (e.txns.length > 1 ? 's' : '') + ' · ' + pct + '%</div></div>'
      + '<div class="amt mono" style="color:var(--coral-ink);">' + Catetin.fmtRp(e.amount) + '</div>'
      + '<svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></div>'
      + '<div class="recap-cat-txns" id="recap-cat-txns-' + i + '"' + (isOpen ? '' : ' hidden') + '></div>'
      + (i === entries.length - 1 ? '' : '<hr class="divider"/>');
  }).join('');

  container.querySelectorAll('[data-recap-cat]').forEach(function (row, i) {
    if (Catetin.recap.openCat === row.dataset.recapCat) {
      Catetin.renderTxnGroups('recap-cat-txns-' + i, entries[i].txns, Catetin.renderRecap, { grouped: false });
    }
    row.addEventListener('click', function () {
      var name = row.dataset.recapCat;
      Catetin.recap.openCat = (Catetin.recap.openCat === name) ? null : name;
      Catetin.recap.renderCategoryList(expenseTx, total);
    });
  });
};

// Groups the month's expenses by Event/Acara (untagged transactions fall
// under "General"), same expand-to-see-transactions pattern as the category
// breakdown above.
Catetin.recap.renderEventList = function (expenseTx, total) {
  var byTrip = {};
  expenseTx.forEach(function (t) {
    var key = t.trip_id || 'general';
    if (!byTrip[key]) byTrip[key] = [];
    byTrip[key].push(t);
  });
  var entries = Object.keys(byTrip).map(function (key) {
    var txns = byTrip[key];
    var trip = key === 'general' ? null : Catetin.state.trips.find(function (tr) { return tr.id === key; });
    return {
      key: key,
      name: trip ? trip.name : 'General',
      icon: trip ? trip.icon : '📁',
      txns: txns,
      amount: txns.reduce(function (s, t) { return s + Number(t.amount); }, 0)
    };
  }).sort(function (a, b) { return b.amount - a.amount; });

  var container = document.getElementById('recap-event-list');
  if (entries.length === 0) { container.innerHTML = '<div class="empty-state">No expenses this month</div>'; return; }

  container.innerHTML = entries.map(function (e, i) {
    var pct = total > 0 ? Math.round(e.amount / total * 100) : 0;
    var isOpen = Catetin.recap.openEvent === e.key;
    return '<div class="txn recap-cat-row' + (isOpen ? ' open' : '') + '" data-recap-event="' + e.key + '">'
      + '<div class="icon-chip" style="background:var(--surface-2);">' + e.icon + '</div>'
      + '<div class="meta"><div class="cat">' + Catetin.escapeHtml(e.name) + '</div><div class="sub">' + e.txns.length + ' transaction' + (e.txns.length > 1 ? 's' : '') + ' · ' + pct + '%</div></div>'
      + '<div class="amt mono" style="color:var(--coral-ink);">' + Catetin.fmtRp(e.amount) + '</div>'
      + '<svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></div>'
      + '<div class="recap-cat-txns" id="recap-event-txns-' + i + '"' + (isOpen ? '' : ' hidden') + '></div>'
      + (i === entries.length - 1 ? '' : '<hr class="divider"/>');
  }).join('');

  container.querySelectorAll('[data-recap-event]').forEach(function (row, i) {
    if (Catetin.recap.openEvent === row.dataset.recapEvent) {
      Catetin.renderTxnGroups('recap-event-txns-' + i, entries[i].txns, Catetin.renderRecap, { grouped: false });
    }
    row.addEventListener('click', function () {
      var key = row.dataset.recapEvent;
      Catetin.recap.openEvent = (Catetin.recap.openEvent === key) ? null : key;
      Catetin.recap.renderEventList(expenseTx, total);
    });
  });
};

Catetin.recap.renderAccountList = function (expenseTx, total) {
  var byAcct = {};
  expenseTx.forEach(function (t) { byAcct[t.payment_source] = (byAcct[t.payment_source] || 0) + Number(t.amount); });
  var entries = Catetin.state.accounts
    .map(function (a) { return { name: a.name, color: a.color, amount: byAcct[a.name] || 0 }; })
    .filter(function (e) { return e.amount > 0; })
    .sort(function (a, b) { return b.amount - a.amount; });

  var container = document.getElementById('recap-acct-list');
  if (entries.length === 0) { container.innerHTML = '<div class="empty-state">No expenses this month</div>'; return; }

  container.innerHTML = entries.map(function (e) {
    var pct = total > 0 ? Math.round(e.amount / total * 100) : 0;
    return '<div class="recap-acct-row"><div class="between"><span style="font-size:13.5px;font-weight:600;">' + Catetin.escapeHtml(e.name) + '</span><span class="mono muted" style="font-size:12px;">' + pct + '%</span></div>'
      + '<div class="budget-track"><div class="budget-fill" style="width:' + pct + '%;background:var(--' + e.color + ');"></div></div>'
      + '<div class="mono" style="font-size:12.5px;margin-top:4px;">' + Catetin.fmtRp(e.amount) + '</div></div>';
  }).join('');
};
