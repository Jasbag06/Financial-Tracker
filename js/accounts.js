window.Catetin = window.Catetin || {};

Catetin.router.onEnter['manage-accounts'] = function () { Catetin.renderManageAccounts(); };

Catetin.renderManageAccounts = function () {
  var el = document.getElementById('manage-acct-list');
  var accounts = Catetin.state.accounts;
  if (accounts.length === 0) { el.innerHTML = '<div class="empty-state">Belum ada akun</div>'; return; }
  el.innerHTML = accounts.map(function (a) {
    var bal = Catetin.computeBalance(a);
    return '<div class="setting-row" style="cursor:default;"><div class="icon-chip" style="background:var(--' + a.color + ');">' + a.name.slice(0, 2).toUpperCase() + '</div>'
      + '<div class="label">' + Catetin.escapeHtml(a.name) + '<div class="muted" style="font-size:11px;font-weight:400;">' + Catetin.fmtRp(bal) + '</div></div>'
      + '<button type="button" class="link" data-del-acct="' + a.id + '" style="color:var(--coral-ink);">Hapus</button></div>';
  }).join('');
  el.querySelectorAll('[data-del-acct]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      if (!window.confirm('Hapus akun ini? Transaksi lama tetap tersimpan.')) return;
      var { error } = await Catetin.supabase.from('payment_sources').delete().eq('id', btn.dataset.delAcct);
      if (error) { Catetin.toast('Gagal menghapus'); return; }
      await Catetin.reloadAll();
      Catetin.renderManageAccounts();
      Catetin.updateSettingsCounts();
    });
  });
};

document.getElementById('new-acct-kind').addEventListener('click', function (e) {
  var btn = e.target.closest('.chip'); if (!btn) return;
  this.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
  btn.classList.add('active');
});
document.getElementById('new-acct-color').addEventListener('click', function (e) {
  var btn = e.target.closest('.swatch'); if (!btn) return;
  this.querySelectorAll('.swatch').forEach(function (c) { c.classList.remove('active'); });
  btn.classList.add('active');
});

document.getElementById('add-account-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var name = document.getElementById('new-acct-name').value.trim();
  var kind = document.querySelector('#new-acct-kind .chip.active').dataset.kind;
  var number = document.getElementById('new-acct-number').value.trim();
  var balance = Number(document.getElementById('new-acct-balance').value || 0);
  var color = document.querySelector('#new-acct-color .swatch.active').dataset.color;
  var { error } = await Catetin.supabase.from('payment_sources').insert({
    user_id: Catetin.state.user.id, name: name, kind: kind, account_number: number || null,
    initial_balance: balance, color: color, sort_order: Catetin.state.accounts.length + 1
  });
  if (error) { Catetin.toast(error.message.indexOf('duplicate') !== -1 ? 'Nama akun sudah ada' : 'Gagal menambah akun'); return; }
  this.reset();
  document.querySelectorAll('#new-acct-kind .chip').forEach(function (c, i) { c.classList.toggle('active', i === 0); });
  document.querySelectorAll('#new-acct-color .swatch').forEach(function (c, i) { c.classList.toggle('active', i === 0); });
  await Catetin.reloadAll();
  Catetin.toast('Akun ditambahkan');
  Catetin.router.go('manage-accounts');
  Catetin.updateSettingsCounts();
});
