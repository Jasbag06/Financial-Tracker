window.Catetin = window.Catetin || {};

Catetin.currentTripId = null;

Catetin.upcomingTrips = function () {
  var today = new Date().toISOString().slice(0, 10);
  return Catetin.state.trips.filter(function (tr) { return !tr.end_date || tr.end_date >= today; });
};

Catetin.tripCardHtml = function (trip) {
  return '<div class="trip-card" data-nav="trip-detail" data-trip-id="' + trip.id + '">'
    + '<div class="acct-top"><div class="acct-id"><div class="acct-badge" style="background:var(--yellow);">' + trip.icon + '</div>'
    + '<div><div class="acct-name">' + Catetin.escapeHtml(trip.name) + '</div><div class="acct-sub">' + Catetin.tripDateRangeLabel(trip) + ' · ' + Catetin.tripStatusLabel(trip) + '</div></div></div></div>'
    + '<div class="trip-total mono">' + Catetin.fmtRp(Catetin.tripExpenseTotal(trip.id)) + '</div></div>';
};

Catetin.renderTripCardsOnDashboard = function () {
  var trips = Catetin.upcomingTrips();
  var html = trips.map(Catetin.tripCardHtml).join('')
    + '<div class="add-acct-card" data-nav="add-trip"><div class="plus-circle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg></div><span>Acara Baru</span></div>';
  document.getElementById('trip-scroll').innerHTML = html;
};

Catetin.router.onEnter.trips = function () {
  var trips = Catetin.state.trips;
  var el = document.getElementById('trips-list');
  if (trips.length === 0) { el.innerHTML = '<div class="empty-state">Belum ada acara. Buat satu buat trip atau event yang mau kamu track terpisah.</div>'; return; }
  el.innerHTML = '<div class="setting-card">' + trips.map(function (trip) {
    return '<button type="button" class="setting-row" data-nav="trip-detail" data-trip-id="' + trip.id + '">'
      + '<div class="icon-chip" style="background:var(--surface-2);">' + trip.icon + '</div>'
      + '<div class="label">' + Catetin.escapeHtml(trip.name) + '<div class="muted" style="font-size:11px;font-weight:400;">' + Catetin.tripDateRangeLabel(trip) + ' · ' + Catetin.tripStatusLabel(trip) + '</div></div>'
      + '<div class="value mono">' + Catetin.fmtRp(Catetin.tripExpenseTotal(trip.id)) + '</div>'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></button>';
  }).join('') + '</div>';
};

Catetin.router.onEnter['add-trip'] = function () {
  document.getElementById('add-trip-form').reset();
  document.getElementById('new-trip-icon').value = '🧳';
  document.getElementById('new-trip-start').value = new Date().toISOString().slice(0, 10);
};

document.getElementById('add-trip-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var name = document.getElementById('new-trip-name').value.trim();
  var icon = document.getElementById('new-trip-icon').value.trim() || '🧳';
  var start = document.getElementById('new-trip-start').value || null;
  var end = document.getElementById('new-trip-end').value || null;
  var { error } = await Catetin.supabase.from('trips').insert({
    user_id: Catetin.state.user.id, name: name, icon: icon, start_date: start, end_date: end
  });
  if (error) { Catetin.toast('Gagal membuat acara'); return; }
  await Catetin.reloadAll();
  Catetin.toast('Acara dibuat');
  Catetin.router.go('trips');
});

Catetin.router.onEnter['trip-detail'] = function () { Catetin.renderTripDetail(); };

Catetin.renderTripDetail = function () {
  var trip = Catetin.state.trips.find(function (t) { return t.id === Catetin.currentTripId; });
  if (!trip) { Catetin.router.go('trips'); return; }

  document.getElementById('trip-detail-name').textContent = trip.icon + ' ' + trip.name;
  document.getElementById('trip-detail-dates').textContent = Catetin.tripDateRangeLabel(trip) + ' · ' + Catetin.tripStatusLabel(trip);

  var txns = Catetin.tripTransactions(trip.id);
  var expenseTxns = txns.filter(function (t) { return t.type === 'expense'; });
  var total = expenseTxns.reduce(function (s, t) { return s + Number(t.amount); }, 0);
  document.getElementById('trip-detail-total').textContent = Catetin.fmtRp(total);

  var byAccount = {};
  expenseTxns.forEach(function (t) { byAccount[t.payment_source] = (byAccount[t.payment_source] || 0) + Number(t.amount); });
  var acctEl = document.getElementById('trip-detail-by-account');
  var acctKeys = Object.keys(byAccount);
  acctEl.innerHTML = acctKeys.length === 0 ? '<div class="empty-state" style="padding:16px;">Belum ada pengeluaran</div>' : acctKeys.map(function (name, i) {
    var acct = Catetin.state.accounts.find(function (a) { return a.name === name; });
    return '<div class="txn"><div class="icon-chip" style="background:var(--surface-2);">' + (acct ? acct.name.slice(0, 2).toUpperCase() : '💳') + '</div>'
      + '<div class="meta"><div class="cat">' + Catetin.escapeHtml(name) + '</div></div>'
      + '<div class="amt mono">' + Catetin.fmtRp(byAccount[name]) + '</div></div>' + (i < acctKeys.length - 1 ? '<hr class="divider"/>' : '');
  }).join('');

  var byCategory = {};
  expenseTxns.forEach(function (t) { byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount); });
  var catEl = document.getElementById('trip-detail-by-category');
  var catKeys = Object.keys(byCategory).sort(function (a, b) { return byCategory[b] - byCategory[a]; });
  catEl.innerHTML = catKeys.length === 0 ? '<div class="empty-state" style="padding:16px;">Belum ada pengeluaran</div>' : catKeys.map(function (name, i) {
    var cat = Catetin.state.categories.find(function (c) { return c.name === name; });
    return '<div class="txn"><div class="icon-chip" style="background:var(--surface-2);">' + (cat ? cat.icon : '💸') + '</div>'
      + '<div class="meta"><div class="cat">' + Catetin.escapeHtml(name) + '</div></div>'
      + '<div class="amt mono">' + Catetin.fmtRp(byCategory[name]) + '</div></div>' + (i < catKeys.length - 1 ? '<hr class="divider"/>' : '');
  }).join('');

  Catetin.renderTxnGroups('trip-detail-txn-list', txns, Catetin.renderTripDetail);
};

document.getElementById('btn-trip-delete').addEventListener('click', async function () {
  var trip = Catetin.state.trips.find(function (t) { return t.id === Catetin.currentTripId; });
  if (!trip) return;
  var ok = await Catetin.modal.confirm({ title: 'Hapus acara "' + trip.name + '"?', message: 'Transaksinya tetap tersimpan, cuma jadi transaksi Umum lagi.', danger: true, confirmLabel: 'Hapus' });
  if (!ok) return;
  var { error } = await Catetin.supabase.from('trips').delete().eq('id', trip.id);
  if (error) { Catetin.toast('Gagal menghapus acara'); return; }
  await Catetin.reloadAll();
  Catetin.toast('Acara dihapus');
  Catetin.router.go('trips');
});
