window.Catetin = window.Catetin || {};

Catetin.router.onEnter.settings = function () { Catetin.renderSettings(); };

Catetin.renderSettings = function () {
  var email = Catetin.state.user.email || '';
  document.getElementById('settings-email').textContent = email;
  document.getElementById('settings-avatar').textContent = email.slice(0, 1).toUpperCase() || 'J';
  Catetin.updateSettingsCounts();
  document.querySelectorAll('#settings-theme-toggle [data-theme-btn]').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.themeBtn === Catetin.state.theme);
  });
  document.getElementById('notif-switch').classList.toggle('off', !Catetin.state.notif);
};

Catetin.updateSettingsCounts = function () {
  document.getElementById('category-count').textContent = Catetin.state.categories.length;
  document.getElementById('account-count').textContent = Catetin.state.accounts.length;
};

document.getElementById('settings-theme-toggle').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-theme-btn]'); if (!btn) return;
  Catetin.state.theme = btn.dataset.themeBtn;
  localStorage.setItem('catetin_theme', Catetin.state.theme);
  document.documentElement.setAttribute('data-theme', Catetin.state.theme);
  document.querySelectorAll('#settings-theme-toggle [data-theme-btn]').forEach(function (b) { b.classList.toggle('active', b === btn); });
});

document.getElementById('notif-switch').addEventListener('click', function () {
  Catetin.state.notif = !Catetin.state.notif;
  localStorage.setItem('catetin_notif', String(Catetin.state.notif));
  this.classList.toggle('off', !Catetin.state.notif);
});
