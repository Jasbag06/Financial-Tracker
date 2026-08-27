window.Catetin = window.Catetin || {};

Catetin.currentBudgetScope = null; // null = General, else a trip id

Catetin.router.onEnter.budget = function () { Catetin.renderBudgetScopes(); };

// One row per scope (General + every Event), each summarizing how much of
// its budgeted categories has been spent, so the Event-first hierarchy the
// user actually thinks in ("Trip Bandung" vs everyday "General") is the
// entry point instead of one flat category list.
Catetin.renderBudgetScopes = function () {
  var scopes = [{ tripId: null, name: 'General', icon: '📁', sub: 'Resets every month' }]
    .concat(Catetin.state.trips.map(function (tr) {
      return { tripId: tr.id, name: tr.name, icon: tr.icon, sub: Catetin.tripDateRangeLabel(tr) };
    }));

  var rows = scopes.map(function (s) {
    var budgets = Catetin.state.budgets.filter(function (b) { return (b.trip_id || null) === s.tripId; });
    var totalBudget = budgets.reduce(function (sum, b) { return sum + Number(b.amount); }, 0);
    var totalSpent = budgets.reduce(function (sum, b) { return sum + Catetin.budgetSpent(s.tripId, b.category); }, 0);
    var valueText = budgets.length ? Catetin.fmtRp(totalSpent) + ' / ' + Catetin.fmtRp(totalBudget) : 'Not set';
    var sub = budgets.length ? (budgets.length + ' categor' + (budgets.length > 1 ? 'ies' : 'y') + ' budgeted') : s.sub;
    return '<button type="button" class="setting-row" data-nav="budget-detail" data-budget-scope="' + (s.tripId || '') + '">'
      + '<div class="icon-chip" style="background:var(--surface-2);">' + s.icon + '</div>'
      + '<div class="label">' + Catetin.escapeHtml(s.name) + '<div class="muted" style="font-size:11px;font-weight:400;">' + sub + '</div></div>'
      + '<div class="value mono" style="font-size:12px;">' + valueText + '</div>'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></button>';
  }).join('');

  document.getElementById('budget-scope-list').innerHTML = '<div class="setting-card">' + rows + '</div>';
};

Catetin.router.onEnter['budget-detail'] = function () { Catetin.renderBudgetDetail(); };

Catetin.renderBudgetDetail = function () {
  var tripId = Catetin.currentBudgetScope || null;
  var trip = tripId ? Catetin.state.trips.find(function (tr) { return tr.id === tripId; }) : null;
  if (tripId && !trip) { Catetin.router.go('budget'); return; }

  document.getElementById('budget-detail-name').textContent = trip ? (trip.icon + ' ' + trip.name) : '📁 General';
  document.getElementById('budget-detail-sub').textContent = trip
    ? Catetin.tripDateRangeLabel(trip) + ' · budget covers the whole event'
    : 'Resets every month · spending not tagged to an event';

  var budgets = Catetin.state.budgets
    .filter(function (b) { return (b.trip_id || null) === tripId; })
    .slice().sort(function (a, b) { return a.category.localeCompare(b.category); });

  var container = document.getElementById('budget-detail-list');
  if (budgets.length === 0) {
    container.innerHTML = '<div class="empty-state">No category budgets here yet.<br>Tap "Add Category Budget" below.</div>';
    return;
  }

  container.innerHTML = budgets.map(function (b) {
    var cat = Catetin.state.categories.find(function (c) { return c.name === b.category; });
    var spent = Catetin.budgetSpent(tripId, b.category);
    var pct = Math.round(spent / Number(b.amount) * 100);
    var color = pct >= 100 ? 'coral' : pct >= 80 ? 'yellow' : 'mint';
    var pillBg = pct >= 100 ? '#FBE1E1' : pct >= 80 ? '#FBEEDA' : '#E1F2EA';
    var pillColor = pct >= 100 ? 'var(--coral-ink)' : pct >= 80 ? 'var(--yellow-ink)' : 'var(--mint-ink)';
    return '<div class="budget-row" data-budget-id="' + b.id + '" style="cursor:pointer;"><div class="between"><span style="font-size:13.5px;font-weight:600;">' + (cat ? cat.icon : '💸') + ' ' + Catetin.escapeHtml(b.category) + '</span><span class="mono pill" style="background:' + pillBg + ';color:' + pillColor + ';">' + pct + '%</span></div>'
      + '<div class="budget-track"><div class="budget-fill" style="width:' + Math.min(pct, 100) + '%;background:var(--' + color + ');"></div></div>'
      + '<div class="between muted mono" style="font-size:11px;margin-top:4px;"><span>' + Catetin.fmtRp(spent) + '</span><span>of ' + Catetin.fmtRp(b.amount) + '</span></div></div>';
  }).join('');

  container.querySelectorAll('[data-budget-id]').forEach(function (row) {
    row.addEventListener('click', async function () {
      var budget = budgets.find(function (b) { return b.id === row.dataset.budgetId; });
      if (!budget) return;
      var result = await Catetin.modal.editBudget(budget);
      if (!result) return;

      if (result === 'delete') {
        var ok = await Catetin.modal.confirm({ title: 'Remove this budget?', danger: true, confirmLabel: 'Remove' });
        if (!ok) return;
        var del = await Catetin.supabase.from('budgets').delete().eq('id', budget.id);
        if (del.error) { Catetin.toast('Failed to remove'); return; }
        await Catetin.reloadAll();
        Catetin.renderBudgetDetail();
        Catetin.toast('Budget removed');
        return;
      }

      var { error } = await Catetin.supabase.from('budgets').update({ amount: result.amount }).eq('id', budget.id);
      if (error) { Catetin.toast('Failed to update'); return; }
      await Catetin.reloadAll();
      Catetin.renderBudgetDetail();
      Catetin.toast('Budget updated');
    });
  });
};

document.getElementById('btn-budget-add').addEventListener('click', async function () {
  var tripId = Catetin.currentBudgetScope || null;
  var used = Catetin.state.budgets.filter(function (b) { return (b.trip_id || null) === tripId; }).map(function (b) { return b.category; });
  var available = Catetin.state.categories.filter(function (c) { return c.type === 'expense' && used.indexOf(c.name) === -1; });
  if (available.length === 0) { Catetin.toast('Every category already has a budget here'); return; }

  var result = await Catetin.modal.addBudget(available);
  if (!result) return;
  var { error } = await Catetin.supabase.from('budgets').insert({
    user_id: Catetin.state.user.id, trip_id: tripId, category: result.category, amount: result.amount
  });
  if (error) { Catetin.toast('Failed to add budget'); return; }
  await Catetin.reloadAll();
  Catetin.renderBudgetDetail();
  Catetin.toast('Budget added');
});
