window.Catetin = window.Catetin || {};

Catetin.DONUT_COLORS = ['coral', 'pink', 'lavender', 'yellow', 'mint'];

Catetin.router.onEnter.dashboard = function () { Catetin.renderDashboard(); };

Catetin.renderDashboard = function () {
  var hour = new Date().getHours();
  document.getElementById('greeting-time').textContent =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting-name').textContent = (Catetin.state.user.email || 'You').split('@')[0] + ' 👋';

  var accounts = Catetin.state.accounts;
  var total = Catetin.computeTotalBalance();
  var monthTx = Catetin.monthTransactions();
  var income = monthTx.filter(function (t) { return t.type === 'income'; }).reduce(function (s, t) { return s + Number(t.amount); }, 0);
  var expense = monthTx.filter(function (t) { return t.type === 'expense'; }).reduce(function (s, t) { return s + Number(t.amount); }, 0);
  var incomePct = (income + expense) > 0 ? Math.round(income / (income + expense) * 100) : 50;

  var html = '<div class="acct-card total"><div class="acct-top">'
    + '<div><div class="acct-name" style="font-size:11.5px;opacity:.7;font-weight:600;">All Accounts</div><div class="acct-sub" style="opacity:.8;">' + accounts.length + ' accounts</div></div>'
    + '<button class="eye-toggle" id="btn-eye-toggle" type="button"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg></button></div>'
    + '<div class="acct-balance mono"><span class="real">' + Catetin.fmtRp(total) + '</span><span class="masked">Rp •• •••</span></div>'
    + '<div class="split-bar" style="margin-top:12px;"><div style="width:' + incomePct + '%;background:var(--mint);"></div><div style="width:' + (100 - incomePct) + '%;background:var(--coral);"></div></div>'
    + '<div class="split-legend"><span style="color:var(--mint);">● In ' + Catetin.fmtShort(income) + '</span><span style="color:var(--coral);">● Out ' + Catetin.fmtShort(expense) + '</span></div></div>';

  accounts.forEach(function (a) {
    var bal = Catetin.computeBalance(a);
    var initials = a.name.slice(0, 2).toUpperCase();
    html += '<div class="acct-card"><div class="acct-top"><div class="acct-id"><div class="acct-badge" style="background:var(--' + a.color + ');">' + initials + '</div>'
      + '<div><div class="acct-name">' + Catetin.escapeHtml(a.name) + '</div><div class="acct-sub">'
      + (a.account_number ? '•••• ' + Catetin.escapeHtml(a.account_number.slice(-4)) : Catetin.kindLabel(a.kind)) + '</div></div></div></div>'
      + '<div class="acct-balance mono"><span class="real">' + Catetin.fmtRp(bal) + '</span><span class="masked">Rp •• •••</span></div></div>';
  });

  html += '<div class="add-acct-card" data-nav="add-account"><div class="plus-circle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg></div><span>Add Bank</span></div>';

  document.getElementById('acct-scroll').innerHTML = html;
  document.getElementById('btn-eye-toggle').addEventListener('click', function () {
    document.body.classList.toggle('balances-hidden');
    Catetin.applyMaskState();
  });

  Catetin.renderTripCardsOnDashboard();
  Catetin.renderDonut(monthTx.filter(function (t) { return t.type === 'expense'; }));
  Catetin.renderRecentTxns();
  Catetin.applyMaskState();
  Catetin.initMaskWatchdog();
};

// Belt-and-suspenders on top of the CSS rules: directly enforce the
// hide/show state on every .real/.masked element via inline style,
// so a fresh render (new account/trip cards) can never end up out of
// sync with whatever is currently masked, regardless of CSS quirks.
Catetin.applyMaskState = function () {
  var hidden = document.body.classList.contains('balances-hidden');
  document.querySelectorAll('.real').forEach(function (el) { el.style.display = hidden ? 'none' : ''; });
  document.querySelectorAll('.masked').forEach(function (el) { el.style.display = hidden ? 'inline' : 'none'; });

  // Known WebKit/iOS Safari quirk: content inside a horizontally-scrolling
  // overflow container sometimes doesn't repaint when a child's display
  // changes, until some other layout event (like a scroll) happens. Force
  // a synchronous reflow on the scroll containers so the toggle shows up
  // immediately instead of only after navigating away and back.
  ['acct-scroll', 'trip-scroll'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var prevTransform = el.style.webkitTransform;
    el.style.webkitTransform = 'translateZ(0)';
    void el.offsetHeight;
    el.style.webkitTransform = prevTransform;
  });
};

// Self-healing watchdog: some devices were seen with individual trip cards
// drifting out of sync with the account cards after repeated eye-toggle
// clicks (root cause never pinned down remotely). Rather than trust every
// code path to call applyMaskState at the right time, just re-run it
// automatically whenever the account/trip scroll containers' contents
// change at all, so it can't stay wrong for more than a moment.
Catetin.initMaskWatchdog = function () {
  if (Catetin._maskWatchdogStarted) return;
  Catetin._maskWatchdogStarted = true;
  var observer = new MutationObserver(function () { Catetin.applyMaskState(); });
  ['acct-scroll', 'trip-scroll'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) observer.observe(el, { childList: true, subtree: true });
  });
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
    legend.innerHTML = '<div class="muted" style="font-size:12.5px;">No expenses this month yet</div>';
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
  Catetin.renderTxnGroups('recent-txn-list', recent, Catetin.renderDashboard, { grouped: false });
};
