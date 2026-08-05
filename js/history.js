window.Catetin = window.Catetin || {};

Catetin.history = { type: '', category: '', tripFilter: '', dateFrom: '', dateTo: '' };

Catetin.router.onEnter.history = function () {
  Catetin.history = { type: '', category: '', tripFilter: '', dateFrom: '', dateTo: '' };
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
  catWrap.innerHTML = '<button type="button" class="chip active" data-cat="" style="flex:none;">Semua Kategori</button>'
    + cats.map(function (c) { return '<button type="button" class="chip" data-cat="' + Catetin.escapeHtml(c.name) + '" style="flex:none;">' + c.icon + ' ' + Catetin.escapeHtml(c.name) + '</button>'; }).join('');
  catWrap.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      catWrap.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      Catetin.history.category = chip.dataset.cat;
      Catetin.renderHistory();
    });
  });

  var tripWrap = document.getElementById('history-trip-filter');
  var trips = Catetin.state.trips;
  tripWrap.innerHTML = '<button type="button" class="chip active" data-trip="" style="flex:none;">Semua</button>'
    + '<button type="button" class="chip" data-trip="general" style="flex:none;">Umum</button>'
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
    if (h.dateFrom && t.occurred_at < h.dateFrom) return false;
    if (h.dateTo && t.occurred_at > h.dateTo) return false;
    if (h.tripFilter === 'general' && t.trip_id) return false;
    if (h.tripFilter && h.tripFilter !== 'general' && t.trip_id !== h.tripFilter) return false;
    return true;
  });
  Catetin.renderTxnGroups('history-list', list, Catetin.renderHistory);
};

// Shared by Riwayat and Acara (trip) detail — groups a transaction list by date
// with tap-to-reveal edit/delete, then re-runs `onChange` after any mutation.
Catetin.renderTxnGroups = function (containerId, list, onChange) {
  var container = document.getElementById(containerId);
  if (list.length === 0) { container.innerHTML = '<div class="empty-state">Tidak ada transaksi</div>'; return; }

  var groups = {};
  var order = [];
  list.forEach(function (t) {
    if (!groups[t.occurred_at]) { groups[t.occurred_at] = []; order.push(t.occurred_at); }
    groups[t.occurred_at].push(t);
  });

  var html = '';
  order.forEach(function (date) {
    html += '<div class="date-label">' + Catetin.fmtDateLabel(date) + '</div><div class="card" style="padding:6px 16px;">';
    var rows = groups[date];
    rows.forEach(function (t, i) {
      var cat = Catetin.state.categories.find(function (c) { return c.name === t.category; });
      var icon = cat ? cat.icon : '💸';
      var sign = t.type === 'income' ? '+' : '-';
      var color = t.type === 'income' ? 'var(--mint-ink)' : 'var(--coral-ink)';
      var trip = t.trip_id ? Catetin.state.trips.find(function (tr) { return tr.id === t.trip_id; }) : null;
      html += '<div class="txn-swipe-wrap"><div class="txn-actions"><button class="act-edit" data-edit="' + t.id + '">Edit</button><button class="act-del" data-del="' + t.id + '">Hapus</button></div>'
        + '<div class="txn" data-swipe-toggle><div class="icon-chip" style="background:var(--surface-2);">' + icon + '</div>'
        + '<div class="meta"><div class="cat">' + Catetin.escapeHtml(t.category) + (trip ? ' · ' + trip.icon + ' ' + Catetin.escapeHtml(trip.name) : '') + '</div><div class="sub">' + Catetin.escapeHtml(t.payment_source) + (t.note ? ' · ' + Catetin.escapeHtml(t.note) : '') + '</div></div>'
        + '<div class="amt mono" style="color:' + color + ';">' + sign + Catetin.fmtShort(t.amount) + '</div></div></div>'
        + (i < rows.length - 1 ? '<hr class="divider"/>' : '');
    });
    html += '</div>';
  });
  container.innerHTML = html;

  container.querySelectorAll('[data-swipe-toggle]').forEach(function (row) {
    row.addEventListener('click', function () { row.classList.toggle('swiped'); });
  });
  container.querySelectorAll('[data-del]').forEach(function (btn) {
    btn.addEventListener('click', async function (e) {
      e.stopPropagation();
      var ok = await Catetin.modal.confirm({ title: 'Hapus transaksi ini?', danger: true, confirmLabel: 'Hapus' });
      if (!ok) return;
      var { error } = await Catetin.supabase.from('transactions').delete().eq('id', btn.dataset.del);
      if (error) { Catetin.toast('Gagal menghapus'); return; }
      await Catetin.reloadAll();
      onChange();
      Catetin.toast('Transaksi dihapus');
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
  var { error } = await Catetin.supabase.from('transactions').update({ amount: result.amount, note: result.note }).eq('id', id);
  if (error) { Catetin.toast('Gagal mengubah'); return; }
  await Catetin.reloadAll();
  onChange();
  Catetin.toast('Transaksi diperbarui');
};
