window.Catetin = window.Catetin || {};

Catetin.history = { type: '', category: '', account: '', tripFilter: '', dateFrom: '', dateTo: '' };

Catetin.router.onEnter.history = function () {
  Catetin.history = { type: '', category: '', account: '', tripFilter: '', dateFrom: '', dateTo: '' };
  document.querySelectorAll('#history-type-toggle .opt').forEach(function (b) { b.classList.toggle('active', b.dataset.type === ''); });
  document.getElementById('history-filter-panel').hidden = true;
  document.getElementById('history-date-from').value = '';
  document.getElementById('history-date-to').value = '';
  Catetin.renderHistoryFilters();
  Catetin.renderHistory();
};

Catetin.renderHistoryFilters = function () {
  var cats = Catetin.state.categories;
  var catWrap = document.getElementById('history-cat-filter');
  catWrap.innerHTML = '<button type="button" class="chip active" data-cat="" style="flex:none;">All Categories</button>'
    + cats.map(function (c) { return '<button type="button" class="chip" data-cat="' + Catetin.escapeHtml(c.name) + '" style="flex:none;">' + c.icon + ' ' + Catetin.escapeHtml(c.name) + '</button>'; }).join('');
  catWrap.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      catWrap.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      Catetin.history.category = chip.dataset.cat;
      Catetin.renderHistory();
    });
  });

  var acctWrap = document.getElementById('history-acct-filter');
  var accounts = Catetin.state.accounts;
  acctWrap.innerHTML = '<button type="button" class="chip active" data-acct="" style="flex:none;">All Accounts</button>'
    + accounts.map(function (a) { return '<button type="button" class="chip" data-acct="' + Catetin.escapeHtml(a.name) + '" style="flex:none;">' + Catetin.escapeHtml(a.name) + '</button>'; }).join('');
  acctWrap.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      acctWrap.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      Catetin.history.account = chip.dataset.acct;
      Catetin.renderHistory();
    });
  });

  var tripWrap = document.getElementById('history-trip-filter');
  var trips = Catetin.state.trips;
  tripWrap.innerHTML = '<button type="button" class="chip active" data-trip="" style="flex:none;">All</button>'
    + '<button type="button" class="chip" data-trip="general" style="flex:none;">General</button>'
    + trips.map(function (tr) { return '<button type="button" class="chip" data-trip="' + tr.id + '" style="flex:none;">' + tr.icon + ' ' + Catetin.escapeHtml(tr.name) + '</button>'; }).join('');
  tripWrap.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      tripWrap.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      Catetin.history.tripFilter = chip.dataset.trip;
      Catetin.renderHistory();
    });
  });
};

document.getElementById('history-type-toggle').addEventListener('click', function (e) {
  var btn = e.target.closest('.opt'); if (!btn) return;
  document.querySelectorAll('#history-type-toggle .opt').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  Catetin.history.type = btn.dataset.type;
  Catetin.renderHistory();
});

document.getElementById('btn-history-filter-toggle').addEventListener('click', function () {
  var el = document.getElementById('history-filter-panel');
  el.hidden = !el.hidden;
});

document.getElementById('history-date-from').addEventListener('change', function () {
  Catetin.history.dateFrom = this.value;
  Catetin.renderHistory();
});
document.getElementById('history-date-to').addEventListener('change', function () {
  Catetin.history.dateTo = this.value;
  Catetin.renderHistory();
});
document.getElementById('btn-history-clear-dates').addEventListener('click', function () {
  Catetin.history.dateFrom = '';
  Catetin.history.dateTo = '';
  document.getElementById('history-date-from').value = '';
  document.getElementById('history-date-to').value = '';
  Catetin.renderHistory();
});

Catetin.renderHistory = function () {
  var h = Catetin.history;
  var list = Catetin.state.transactions.filter(function (t) {
    if (h.type && t.type !== h.type) return false;
    if (h.category && t.category !== h.category) return false;
    if (h.account && t.payment_source !== h.account) return false;
    if (h.dateFrom && t.occurred_at < h.dateFrom) return false;
    if (h.dateTo && t.occurred_at > h.dateTo) return false;
    if (h.tripFilter === 'general' && t.trip_id) return false;
    if (h.tripFilter && h.tripFilter !== 'general' && t.trip_id !== h.tripFilter) return false;
    return true;
  });
  Catetin.renderTxnGroups('history-list', list, Catetin.renderHistory);
};

// Shared by History, Home, and Event detail — renders a transaction list with
// tap-to-reveal edit/delete, then re-runs `onChange` after any mutation.
// Grouped by date by default (History/Event detail); pass {grouped:false} for
// a flat list that shows the date inline per row instead (Home).
Catetin.renderTxnGroups = function (containerId, list, onChange, opts) {
  opts = opts || {};
  var grouped = opts.grouped !== false;
  var container = document.getElementById(containerId);
  if (list.length === 0) { container.innerHTML = '<div class="empty-state">No transactions</div>'; return; }

  function rowHtml(t, isLast) {
    var cat = Catetin.state.categories.find(function (c) { return c.name === t.category; });
    var icon = cat ? cat.icon : '💸';
    var sign = t.type === 'income' ? '+' : '-';
    var color = t.type === 'income' ? 'var(--mint-ink)' : 'var(--coral-ink)';
    var trip = t.trip_id ? Catetin.state.trips.find(function (tr) { return tr.id === t.trip_id; }) : null;
    var subParts = [Catetin.escapeHtml(t.payment_source)];
    if (!grouped) subParts.push(Catetin.fmtDateShort(t.occurred_at));
    if (t.note) subParts.push(Catetin.escapeHtml(t.note));
    var receiptBtn = t.receipt_url ? '<button type="button" class="receipt-badge" data-receipt="' + Catetin.escapeHtml(t.receipt_url) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg></button>' : '';
    return '<div class="txn-swipe-wrap"><div class="txn-actions"><button class="act-edit" data-edit="' + t.id + '">Edit</button><button class="act-del" data-del="' + t.id + '">Delete</button></div>'
      + '<div class="txn" data-swipe-toggle><div class="icon-chip" style="background:var(--surface-2);">' + icon + '</div>'
      + '<div class="meta"><div class="cat">' + Catetin.escapeHtml(t.category) + (trip ? ' · ' + trip.icon + ' ' + Catetin.escapeHtml(trip.name) : '') + '</div><div class="sub">' + subParts.join(' · ') + '</div></div>'
      + receiptBtn
      + '<div class="amt mono" style="color:' + color + ';">' + sign + Catetin.fmtShort(t.amount) + '</div></div></div>'
      + (isLast ? '' : '<hr class="divider"/>');
  }

  var html = '';
  if (grouped) {
    var groups = {};
    var order = [];
    list.forEach(function (t) {
      if (!groups[t.occurred_at]) { groups[t.occurred_at] = []; order.push(t.occurred_at); }
      groups[t.occurred_at].push(t);
    });
    order.forEach(function (date) {
      html += '<div class="date-label">' + Catetin.fmtDateLabel(date) + '</div><div class="card" style="padding:6px 16px;">';
      var rows = groups[date];
      rows.forEach(function (t, i) { html += rowHtml(t, i === rows.length - 1); });
      html += '</div>';
    });
  } else {
    html += '<div class="card" style="padding:6px 16px;">';
    list.forEach(function (t, i) { html += rowHtml(t, i === list.length - 1); });
    html += '</div>';
  }
  container.innerHTML = html;

  container.querySelectorAll('[data-swipe-toggle]').forEach(function (row) {
    row.addEventListener('click', function () { row.classList.toggle('swiped'); });
  });
  container.querySelectorAll('[data-receipt]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      Catetin.showReceiptModal(btn.dataset.receipt);
    });
  });
  container.querySelectorAll('[data-del]').forEach(function (btn) {
    btn.addEventListener('click', async function (e) {
      e.stopPropagation();
      var ok = await Catetin.modal.confirm({ title: 'Delete this transaction?', danger: true, confirmLabel: 'Delete' });
      if (!ok) return;
      var { error } = await Catetin.supabase.from('transactions').delete().eq('id', btn.dataset.del);
      if (error) { Catetin.toast('Failed to delete'); return; }
      await Catetin.reloadAll();
      onChange();
      Catetin.toast('Transaction deleted');
    });
  });
  container.querySelectorAll('[data-edit]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); Catetin.editTransaction(btn.dataset.edit, onChange); });
  });
};

Catetin.editTransaction = async function (id, onChange) {
  var t = Catetin.state.transactions.find(function (x) { return x.id === id; });
  if (!t) return;
  var result = await Catetin.modal.editTransaction(t);
  if (!result) return;
  var { error } = await Catetin.supabase.from('transactions').update(result).eq('id', id);
  if (error) { Catetin.toast('Failed to update'); return; }
  await Catetin.reloadAll();
  onChange();
  Catetin.toast('Transaction updated');
};
