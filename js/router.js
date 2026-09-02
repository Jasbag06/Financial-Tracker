window.Catetin = window.Catetin || {};

Catetin.VIEWS = ['auth', 'dashboard', 'catat', 'history', 'budget', 'budget-detail', 'settings',
  'manage-categories', 'manage-accounts', 'add-account', 'install-guide', 'scan', 'scan-result',
  'trips', 'add-trip', 'trip-detail', 'recap',
  'debts', 'add-debt', 'debt-detail'];
Catetin.NAV_VIEWS = ['dashboard', 'history', 'budget', 'settings'];

Catetin.router = { current: null, onEnter: {} };

Catetin.router.go = function (name, opts) {
  opts = opts || {};
  if (Catetin.VIEWS.indexOf(name) === -1) name = 'dashboard';

  Catetin.VIEWS.forEach(function (v) {
    var el = document.getElementById('view-' + v);
    if (el) el.hidden = (v !== name);
  });

  var nav = document.getElementById('navbar');
  nav.hidden = Catetin.NAV_VIEWS.indexOf(name) === -1;
  document.querySelectorAll('.navitem[data-nav]').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-nav') === name);
  });

  Catetin.router.current = name;
  if (!opts.silent) location.hash = name;

  var viewEl = document.getElementById('view-' + name);
  if (viewEl) {
    viewEl.scrollTop = 0;
    viewEl.classList.remove('view-enter');
    void viewEl.offsetWidth; // force reflow so the enter animation restarts every navigation
    viewEl.classList.add('view-enter');
  }

  if (Catetin.router.onEnter[name]) Catetin.router.onEnter[name]();
};

window.addEventListener('hashchange', function () {
  var name = location.hash.replace('#', '') || 'catat';
  Catetin.router.go(name, { silent: true });
});

document.addEventListener('click', function (e) {
  var btn = e.target.closest('[data-nav]');
  if (!btn) return;
  if (btn.dataset.tripId) Catetin.currentTripId = btn.dataset.tripId;
  if (btn.dataset.budgetScope !== undefined) Catetin.currentBudgetScope = btn.dataset.budgetScope || null;
  if (btn.dataset.debtPerson) Catetin.currentDebtPerson = btn.dataset.debtPerson;
  // The Home card always lists people who owe you, so carry the direction
  // along - otherwise the detail page would look the person up in whichever
  // tab the Debts list happened to be left on.
  if (btn.dataset.debtDirection) Catetin.debts.direction = btn.dataset.debtDirection;
  Catetin.router.go(btn.getAttribute('data-nav'));
});
