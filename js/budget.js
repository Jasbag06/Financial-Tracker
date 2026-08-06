window.Catetin = window.Catetin || {};

Catetin.router.onEnter.budget = function () { Catetin.renderBudget(); };

Catetin.renderBudget = function () {
  document.getElementById('budget-month-label').textContent = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  var monthTx = Catetin.monthTransactions().filter(function (t) { return t.type === 'expense'; });
  var byCat = {};
  monthTx.forEach(function (t) { byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount); });

  var cats = Catetin.state.categories.filter(function (c) { return c.type === 'expense' && c.budget_monthly; });
  var container = document.getElementById('budget-list');
  if (cats.length === 0) {
    container.innerHTML = '<div class="empty-state">No categories with a budget yet.<br>Set one up in Settings &rarr; Manage Categories.</div>';
    return;
  }

  cats = cats.slice().sort(function (a, b) {
    var pa = (byCat[a.name] || 0) / a.budget_monthly, pb = (byCat[b.name] || 0) / b.budget_monthly;
    return pb - pa;
  });

  container.innerHTML = cats.map(function (c) {
    var spent = byCat[c.name] || 0;
    var pct = Math.round(spent / c.budget_monthly * 100);
    var color = pct >= 100 ? 'coral' : pct >= 80 ? 'yellow' : 'mint';
    var pillBg = pct >= 100 ? '#FBE1E1' : pct >= 80 ? '#FBEEDA' : '#E1F2EA';
    var pillColor = pct >= 100 ? 'var(--coral-ink)' : pct >= 80 ? 'var(--yellow-ink)' : 'var(--mint-ink)';
    return '<div class="budget-row"><div class="between"><span style="font-size:13.5px;font-weight:600;">' + c.icon + ' ' + Catetin.escapeHtml(c.name) + '</span><span class="mono pill" style="background:' + pillBg + ';color:' + pillColor + ';">' + pct + '%</span></div>'
      + '<div class="budget-track"><div class="budget-fill" style="width:' + Math.min(pct, 100) + '%;background:var(--' + color + ');"></div></div>'
      + '<div class="between muted mono" style="font-size:11px;margin-top:4px;"><span>' + Catetin.fmtRp(spent) + '</span><span>of ' + Catetin.fmtRp(c.budget_monthly) + '</span></div></div>';
  }).join('');
};
