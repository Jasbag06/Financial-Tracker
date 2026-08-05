window.Catetin = window.Catetin || {};

document.documentElement.setAttribute('data-theme', Catetin.state.theme);

Catetin.onAuthed = async function () {
  await Catetin.reloadAll();
  var target = location.hash.replace('#', '') || 'catat';
  if (target === 'auth') target = 'catat';
  Catetin.router.go(target, { silent: true });
  location.hash = target;
};

if (Catetin.configReady) {
  Catetin.auth.init();
} else {
  document.getElementById('auth-sub').textContent = 'Isi js/config.js dengan URL & anon key Supabase kamu dulu (lihat README.md).';
  document.getElementById('auth-form').hidden = true;
  document.getElementById('auth-toggle-mode').hidden = true;
  document.getElementById('app').hidden = false;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
