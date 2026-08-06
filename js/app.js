window.Catetin = window.Catetin || {};

document.documentElement.setAttribute('data-theme', Catetin.state.theme);

Catetin.seedDefaultsIfEmpty = async function () {
  var uid = Catetin.state.user.id;
  if (Catetin.state.categories.length === 0) {
    await Catetin.supabase.from('categories').insert([
      { user_id: uid, name: 'Food & Drink', type: 'expense', icon: '🍜', sort_order: 1 },
      { user_id: uid, name: 'Transport', type: 'expense', icon: '🛵', sort_order: 2 },
      { user_id: uid, name: 'Shopping', type: 'expense', icon: '🛍️', sort_order: 3 },
      { user_id: uid, name: 'Bills', type: 'expense', icon: '🧾', sort_order: 4 },
      { user_id: uid, name: 'Entertainment', type: 'expense', icon: '🎮', sort_order: 5 },
      { user_id: uid, name: 'Health', type: 'expense', icon: '💊', sort_order: 6 },
      { user_id: uid, name: 'Other', type: 'expense', icon: '📦', sort_order: 7 },
      { user_id: uid, name: 'Salary', type: 'income', icon: '💼', sort_order: 1 },
      { user_id: uid, name: 'Bonus', type: 'income', icon: '🎁', sort_order: 2 },
      { user_id: uid, name: 'Other', type: 'income', icon: '📥', sort_order: 3 }
    ]);
  }
  if (Catetin.state.accounts.length === 0) {
    await Catetin.supabase.from('payment_sources').insert([
      { user_id: uid, name: 'Cash', kind: 'cash', initial_balance: 0, color: 'pink', sort_order: 1 }
    ]);
  }
};

Catetin.onAuthed = async function () {
  await Catetin.reloadAll();
  if (Catetin.state.categories.length === 0 || Catetin.state.accounts.length === 0) {
    await Catetin.seedDefaultsIfEmpty();
    await Catetin.reloadAll();
  }
  var target = location.hash.replace('#', '') || 'catat';
  if (target === 'auth') target = 'catat';
  Catetin.router.go(target, { silent: true });
  location.hash = target;
};

if (Catetin.configReady) {
  Catetin.auth.init();
} else {
  document.getElementById('auth-sub').textContent = 'Fill in js/config.js with your Supabase URL & anon key first (see README.md).';
  document.getElementById('auth-form').hidden = true;
  document.getElementById('auth-toggle-mode').hidden = true;
  document.getElementById('app').hidden = false;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
