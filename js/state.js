window.Catetin = window.Catetin || {};

Catetin.state = {
  user: null,
  categories: [],
  accounts: [],
  transactions: [],
  trips: [],
  budgets: [],
  debts: [],
  debtPayments: [],
  theme: localStorage.getItem('catetin_theme') || 'light',
  notif: localStorage.getItem('catetin_notif') !== 'false'
};

Catetin.computeBalance = function (account) {
  var sum = Number(account.initial_balance) || 0;
  Catetin.state.transactions.forEach(function (t) {
    if (t.payment_source !== account.name) return;
    sum += t.type === 'income' ? Number(t.amount) : -Number(t.amount);
  });
  return sum;
};

Catetin.computeTotalBalance = function () {
  return Catetin.state.accounts.reduce(function (sum, a) { return sum + Catetin.computeBalance(a); }, 0);
};

Catetin.monthTransactions = function (yyyyMM) {
  yyyyMM = yyyyMM || new Date().toISOString().slice(0, 7);
  return Catetin.state.transactions.filter(function (t) { return t.occurred_at.slice(0, 7) === yyyyMM; });
};

Catetin.tripTransactions = function (tripId) {
  return Catetin.state.transactions.filter(function (t) { return t.trip_id === tripId; });
};

Catetin.tripExpenseTotal = function (tripId) {
  return Catetin.tripTransactions(tripId)
    .filter(function (t) { return t.type === 'expense'; })
    .reduce(function (s, t) { return s + Number(t.amount); }, 0);
};

Catetin.tripStatusLabel = function (trip) {
  var today = new Date().toISOString().slice(0, 10);
  if (trip.start_date && trip.start_date > today) return 'Upcoming';
  if (trip.end_date && trip.end_date < today) return 'Done';
  return 'Ongoing';
};

Catetin.tripDateRangeLabel = function (trip) {
  if (!trip.start_date && !trip.end_date) return 'No date';
  var fmt = function (d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' }); };
  if (trip.start_date && trip.end_date) return fmt(trip.start_date) + ' – ' + fmt(trip.end_date);
  return fmt(trip.start_date || trip.end_date);
};

Catetin.reloadAll = async function () {
  var uid = Catetin.state.user.id;
  var [catsRes, acctsRes, txnsRes, tripsRes, budgetsRes, debtsRes, debtPaysRes] = await Promise.all([
    Catetin.supabase.from('categories').select('*').eq('user_id', uid).order('sort_order'),
    Catetin.supabase.from('payment_sources').select('*').eq('user_id', uid).order('sort_order'),
    Catetin.supabase.from('transactions').select('*').eq('user_id', uid)
      .order('occurred_at', { ascending: false }).order('created_at', { ascending: false }),
    Catetin.supabase.from('trips').select('*').eq('user_id', uid).order('start_date', { ascending: false }),
    Catetin.supabase.from('budgets').select('*').eq('user_id', uid),
    Catetin.supabase.from('debts').select('*').eq('user_id', uid).order('occurred_at', { ascending: false }),
    Catetin.supabase.from('debt_payments').select('*').eq('user_id', uid).order('paid_at', { ascending: false })
  ]);
  Catetin.state.categories = catsRes.data || [];
  // Cash always sorts last, however many other banks/wallets get added later.
  Catetin.state.accounts = (acctsRes.data || []).slice().sort(function (a, b) {
    var aCash = a.kind === 'cash' ? 1 : 0;
    var bCash = b.kind === 'cash' ? 1 : 0;
    if (aCash !== bCash) return aCash - bCash;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  Catetin.state.transactions = txnsRes.data || [];
  Catetin.state.trips = tripsRes.data || [];
  Catetin.state.budgets = budgetsRes.data || [];
  Catetin.state.debts = debtsRes.data || [];
  Catetin.state.debtPayments = debtPaysRes.data || [];
};

// ---- debts ----
// "Settled" is always derived from the payments, never stored, so a debt and
// its instalments can't drift out of sync.
Catetin.debtPaymentsFor = function (debtId) {
  return Catetin.state.debtPayments.filter(function (p) { return p.debt_id === debtId; });
};

Catetin.debtPaid = function (debtId) {
  return Catetin.debtPaymentsFor(debtId).reduce(function (s, p) { return s + Number(p.amount); }, 0);
};

Catetin.debtRemaining = function (debt) {
  return Math.max(0, Number(debt.amount) - Catetin.debtPaid(debt.id));
};

Catetin.debtIsSettled = function (debt) {
  return Catetin.debtPaid(debt.id) >= Number(debt.amount);
};

Catetin.debtSettledDate = function (debt) {
  var dates = Catetin.debtPaymentsFor(debt.id).map(function (p) { return p.paid_at; }).sort();
  return dates.length ? dates[dates.length - 1] : null;
};

// Positive number of days past due, or 0 when not overdue / no due date /
// already settled.
Catetin.debtDaysOverdue = function (debt) {
  if (!debt.due_date || Catetin.debtIsSettled(debt)) return 0;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var due = new Date(debt.due_date + 'T00:00:00');
  var days = Math.floor((today - due) / 86400000);
  return days > 0 ? days : 0;
};

Catetin.debtsByDirection = function (direction) {
  return Catetin.state.debts.filter(function (d) { return d.direction === direction; });
};

Catetin.debtOutstandingTotal = function (direction) {
  return Catetin.debtsByDirection(direction).reduce(function (s, d) { return s + Catetin.debtRemaining(d); }, 0);
};

// Groups a direction's debts by person so someone who borrowed three separate
// times shows up once, with their total. Sorted by who owes the most, and
// people who are fully settled sink to the bottom.
Catetin.debtPeople = function (direction) {
  var groups = {};
  var order = [];
  Catetin.debtsByDirection(direction).forEach(function (d) {
    var key = d.person_name.trim().toLowerCase();
    if (!groups[key]) { groups[key] = { name: d.person_name.trim(), debts: [] }; order.push(key); }
    groups[key].debts.push(d);
  });
  return order.map(function (key) {
    var g = groups[key];
    var outstanding = g.debts.reduce(function (s, d) { return s + Catetin.debtRemaining(d); }, 0);
    var total = g.debts.reduce(function (s, d) { return s + Number(d.amount); }, 0);
    var overdue = g.debts.reduce(function (m, d) { return Math.max(m, Catetin.debtDaysOverdue(d)); }, 0);
    return { name: g.name, debts: g.debts, outstanding: outstanding, total: total, overdue: overdue };
  }).sort(function (a, b) {
    if ((a.outstanding > 0) !== (b.outstanding > 0)) return b.outstanding - a.outstanding;
    if (a.overdue !== b.overdue) return b.overdue - a.overdue;
    return b.outstanding - a.outstanding;
  });
};

Catetin.debtNames = function () {
  var seen = {};
  var names = [];
  Catetin.state.debts.forEach(function (d) {
    var key = d.person_name.trim().toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    names.push(d.person_name.trim());
  });
  return names.sort(function (a, b) { return a.localeCompare(b); });
};

Catetin.debtInitials = function (name) {
  var parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

Catetin.debtColor = function (name) {
  var colors = ['coral', 'pink', 'lavender', 'yellow', 'mint'];
  var sum = 0;
  for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
};

// Budgets are scoped Event-first, then Category: trip_id === null is the
// "General" bucket (day-to-day spending not tagged to an event).
Catetin.findBudget = function (tripId, category) {
  tripId = tripId || null;
  return Catetin.state.budgets.find(function (b) { return (b.trip_id || null) === tripId && b.category === category; }) || null;
};

// General budgets reset every month (like the old per-category budget did);
// event budgets cover the whole event, so they sum every matching expense
// regardless of date.
Catetin.budgetSpent = function (tripId, category) {
  tripId = tripId || null;
  var thisMonth = new Date().toISOString().slice(0, 7);
  return Catetin.state.transactions
    .filter(function (t) {
      if (t.type !== 'expense' || t.category !== category) return false;
      if ((t.trip_id || null) !== tripId) return false;
      if (!tripId) return t.occurred_at.slice(0, 7) === thisMonth;
      return true;
    })
    .reduce(function (s, t) { return s + Number(t.amount); }, 0);
};
