window.Catetin = window.Catetin || {};

Catetin.state = {
  user: null,
  categories: [],
  accounts: [],
  transactions: [],
  trips: [],
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
  var [catsRes, acctsRes, txnsRes, tripsRes] = await Promise.all([
    Catetin.supabase.from('categories').select('*').eq('user_id', uid).order('sort_order'),
    Catetin.supabase.from('payment_sources').select('*').eq('user_id', uid).order('sort_order'),
    Catetin.supabase.from('transactions').select('*').eq('user_id', uid)
      .order('occurred_at', { ascending: false }).order('created_at', { ascending: false }),
    Catetin.supabase.from('trips').select('*').eq('user_id', uid).order('start_date', { ascending: false })
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
};
