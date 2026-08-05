window.Catetin = window.Catetin || {};

Catetin.manageCatType = 'expense';

Catetin.router.onEnter['manage-categories'] = function () {
  Catetin.manageCatType = 'expense';
  document.querySelectorAll('#manage-cat-type-toggle .opt').forEach(function (b) {
    b.classList.toggle('active', b.dataset.type === 'expense');
    b.style.color = b.dataset.type === 'expense' ? 'var(--coral-ink)' : '';
  });
  Catetin.renderManageCategories();
};

document.getElementById('manage-cat-type-toggle').addEventListener('click', function (e) {
  var btn = e.target.closest('.opt'); if (!btn) return;
  document.querySelectorAll('#manage-cat-type-toggle .opt').forEach(function (b) { b.classList.remove('active'); b.style.color = ''; });
  btn.classList.add('active');
  btn.style.color = btn.dataset.type === 'expense' ? 'var(--coral-ink)' : 'var(--mint-ink)';
  Catetin.manageCatType = btn.dataset.type;
  Catetin.renderManageCategories();
});

Catetin.renderManageCategories = function () {
  var cats = Catetin.state.categories.filter(function (c) { return c.type === Catetin.manageCatType; });
  var el = document.getElementById('manage-cat-list');
  if (cats.length === 0) { el.innerHTML = '<div class="empty-state">Belum ada kategori</div>'; return; }
  el.innerHTML = cats.map(function (c) {
    return '<div class="setting-row" style="cursor:default;"><div class="icon-chip" style="background:var(--surface-2);">' + c.icon + '</div>'
      + '<div class="label">' + Catetin.escapeHtml(c.name) + (c.budget_monthly ? '<div class="muted" style="font-size:11px;font-weight:400;">Budget ' + Catetin.fmtRp(c.budget_monthly) + '</div>' : '') + '</div>'
      + '<button type="button" class="link" data-del-cat="' + c.id + '" style="color:var(--coral-ink);">Hapus</button></div>';
  }).join('');
  el.querySelectorAll('[data-del-cat]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      if (!window.confirm('Hapus kategori ini?')) return;
      var { error } = await Catetin.supabase.from('categories').delete().eq('id', btn.dataset.delCat);
      if (error) { Catetin.toast('Gagal menghapus (mungkin masih dipakai transaksi)'); return; }
      await Catetin.reloadAll();
      Catetin.renderManageCategories();
      Catetin.updateSettingsCounts();
    });
  });
};

document.getElementById('add-category-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var name = document.getElementById('new-cat-name').value.trim();
  var icon = document.getElementById('new-cat-icon').value.trim() || '📦';
  var budget = document.getElementById('new-cat-budget').value;
  var sameType = Catetin.state.categories.filter(function (c) { return c.type === Catetin.manageCatType; });
  var { error } = await Catetin.supabase.from('categories').insert({
    user_id: Catetin.state.user.id, name: name, type: Catetin.manageCatType, icon: icon,
    budget_monthly: budget ? Number(budget) : null,
    sort_order: sameType.length + 1
  });
  if (error) { Catetin.toast('Gagal menambah kategori'); return; }
  this.reset();
  await Catetin.reloadAll();
  Catetin.renderManageCategories();
  Catetin.updateSettingsCounts();
  Catetin.toast('Kategori ditambahkan');
});
