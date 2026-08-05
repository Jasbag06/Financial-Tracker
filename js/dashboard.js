window.Catetin = window.Catetin || {};

Catetin.DONUT_COLORS = ['coral', 'pink', 'lavender', 'yellow', 'mint'];

Catetin.router.onEnter.dashboard = function () { Catetin.renderDashboard(); };

Catetin.renderDashboard = function () {
  var hour = new Date().getHours();
  document.getElementById('greeting-time').textContent =
    hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  document.getElementById('greeting-name').textContent = (Catetin.state.user.email || 'Kamu').split('@')[0] + ' 👋';

  var accounts = Catetin.state.accounts;
  var total = Catetin.computeTotalBalance();
  var monthTx = Catetin.monthTransactions();
  var income = monthTx.filter(function (t) { return t.type === 'income'; }).reduce(function (s, t) { return s + Number(t.amount); }, 0);
  var expense = monthTx.filter(function (t) { return t.type === 'expense'; }).reduce(function (s, t) { return s + Number(t.amount); }, 0);
  var incomePct = (income + expense) > 0 ? Math.round(income / (income + expense) * 100) : 50;

  var html = '<div class="acct-card total"><div class="acct-top">'
    + '<div><div class="acct-name" style="font-size:11.5px;opacity:.7;font-weight:600;">Semua Akun</div><div class="acct-sub" style="opacity:.8;">' + accounts.length + ' akun</div></div>'
    + '<button class="eye-toggle" id="btn-eye-toggle" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>'
    + '<div class="acct-balance mono"><span class="real">' + Catetin.fmtRp(total) + '</span><span class="masked">Rp •• •••</span></div>'
    + '<div class="split-bar" style="margin-top:12px;"><div style="width:' + incomePct + '%;background:var(--mint);"></div><div style="width:' + (100 - incomePct) + '%;background:var(--coral);"></div></div>'
    + '<div class="split-legend"><span style="color:var(--mint);">● Masuk ' + Catetin.fmtShort(income) + '</span><span style="color:var(--coral);">● Keluar ' + Catetin.fmtShort(expense) + '</span></div></div>';

  accounts.forEach(function (a) {
    var bal = Catetin.computeBalance(a);
    var initials = a.name.slice(0, 2).toUpperCase();
    html += '<div class="acct-card"><div class="acct-top"><div class="acct-id"><div class="acct-badge" style="background:var(--' + a.color + ');">' + initials + '</div>'
      + '<div><div class="acct-name">' + Catetin.escapeHtml(a.name) + '</div><div class="acct-sub">'
      + (a.account_number ? '•••• ' + Catetin.escapeHtml(a.account_number.slice(-4)) : Catetin.kindLabel(a.kind)) + '</div></div></div></div>'
      + '<div class="acct-balance mono"><span class="real">' + Catetin.fmtRp(bal) + '</span><span class="masked">Rp •• •••</span></div></div>';
  });

  html += '<div class="add-acct-card" data-nav="add-account"><div class="plus-circle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg></div><span>Tambah Bank</span></div>';

  document.getElementById('acct-scroll').innerHTML = html;
  document.getElementById('btn-eye-toggle').addEventListener('click', function () {
    document.body.classList.toggle('balances-hidden');
  });

  Catetin.renderTripCardsOnDashboard();
  Catetin.renderDonut(monthTx.filter(function (t) { return t.type === 'expense'; }));
  Catetin.renderRecentTxns();
};

Catetin.renderDonut = function (expenseTx) {
  var byCat = {};
  expenseTx.forEach(function (t) { byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount); });
  var entries = Object.keys(byCat).map(function (k) { return { name: k, amount: byCat[k] }; }).sort(function (a, b) { return b.amount - a.amount; });
  var total = entries.reduce(function (s, e) { return s + e.amount; }, 0);
  var svg = document.getElementById('donut-svg');
  var legend = document.getElementById('donut-legend');

  if (total === 0) {
    svg.innerHTML = '<circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-2)" stroke-width="4"/>';
    legend.innerHTML = '<div class="muted" style="font-size:12.5px;">Belum ada pengeluaran bulan ini</div>';
    return;
  }

  var top = entries.slice(0, 5);
  var circles = '<circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-2)" stroke-width="4"/>';
  var offset = 0;
  var legendHtml = '';
  top.forEach(function (e, i) {
    var pct = e.amount / total * 100;
    var color = Catetin.DONUT_COLORS[i % Catetin.DONUT_COLORS.length];
    circles += '<circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--' + color + ')" stroke-width="4" stroke-dasharray="' + pct.toFixed(1) + ' ' + (100 - pct).toFixed(1) + '" stroke-dashoffset="' + (-offset).toFixed(1) + '" transform="rotate(-90 18 18)"/>';
    offset += pct;
    legendHtml += '<div class="legend-row"><span class="legend-left"><span class="dot" style="background:var(--' + color + ');"></span>' + Catetin.escapeHtml(e.name) + '</span><span class="mono">' + Math.round(pct) + '%</span></div>';
  });
  circles += '<text x="18" y="20" text-anchor="middle" font-size="6" fill="var(--text)" font-weight="700">' + Catetin.fmtShort(total) + '</text>';
  svg.innerHTML = circles;
  legend.innerHTML = legendHtml;
};

Catetin.renderRecentTxns = function () {
  var recent = Catetin.state.transactions.slice(0, 5);
  var el = document.getElementById('recent-txn-list');
  if (recent.length === 0) { el.innerHTML = '<div class="empty-state">Belum ada transaksi</div>'; return; }
  el.innerHTML = recent.map(function (t, i) {
    var cat = Catetin.state.categories.find(function (c) { return c.name === t.category; });
    var icon = cat ? cat.icon : '💸';
    var sign = t.type === 'income' ? '+' : '-';
    var color = t.type === 'income' ? 'var(--mint-ink)' : 'var(--coral-ink)';
    return '<div class="txn"><div class="icon-chip" style="background:var(--surface-2);">' + icon + '</div>'
      + '<div class="meta"><div class="cat">' + Catetin.escapeHtml(t.category) + '</div><div class="sub">' + Catetin.escapeHtml(t.payment_source) + ' · ' + Catetin.fmtDateLabel(t.occurred_at) + '</div></div>'
      + '<div class="amt mono" style="color:' + color + ';">' + sign + Catetin.fmtShort(t.amount) + '</div></div>'
      + (i < recent.length - 1 ? '<hr class="divider"/>' : '');
  }).join('');
};
