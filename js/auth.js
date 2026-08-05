window.Catetin = window.Catetin || {};

Catetin.auth = { mode: 'signin' };

Catetin.auth.init = async function () {
  var { data } = await Catetin.supabase.auth.getSession();
  if (data.session) {
    Catetin.state.user = data.session.user;
    await Catetin.onAuthed();
  } else {
    Catetin.router.go('auth', { silent: true });
  }
  Catetin.supabase.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_OUT') {
      Catetin.state.user = null;
      Catetin.state.categories = [];
      Catetin.state.accounts = [];
      Catetin.state.transactions = [];
      location.hash = '';
      Catetin.router.go('auth', { silent: true });
    }
  });
  document.getElementById('app').hidden = false;
};

document.getElementById('auth-toggle-mode').addEventListener('click', function () {
  Catetin.auth.mode = Catetin.auth.mode === 'signin' ? 'signup' : 'signin';
  document.getElementById('auth-submit').textContent = Catetin.auth.mode === 'signin' ? 'Masuk' : 'Daftar';
  this.textContent = Catetin.auth.mode === 'signin' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk';
  document.getElementById('auth-error').textContent = '';
});

document.getElementById('auth-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var email = document.getElementById('auth-email').value.trim();
  var password = document.getElementById('auth-password').value;
  var errEl = document.getElementById('auth-error');
  errEl.style.color = 'var(--coral-ink)';
  errEl.textContent = '';
  var btn = document.getElementById('auth-submit');
  btn.disabled = true;
  try {
    var res;
    if (Catetin.auth.mode === 'signin') {
      res = await Catetin.supabase.auth.signInWithPassword({ email: email, password: password });
    } else {
      res = await Catetin.supabase.auth.signUp({ email: email, password: password });
    }
    if (res.error) throw res.error;
    if (Catetin.auth.mode === 'signup' && !res.data.session) {
      errEl.style.color = 'var(--mint-ink)';
      errEl.textContent = 'Cek email kamu untuk konfirmasi akun, lalu masuk.';
      document.getElementById('auth-toggle-mode').click();
      return;
    }
    Catetin.state.user = res.data.session.user;
    await Catetin.onAuthed();
  } catch (err) {
    errEl.textContent = err.message || 'Gagal masuk. Coba lagi.';
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('btn-logout').addEventListener('click', async function () {
  var ok = await Catetin.modal.confirm({ title: 'Keluar dari Catetin?', confirmLabel: 'Keluar', danger: true });
  if (!ok) return;
  await Catetin.supabase.auth.signOut();
});

document.getElementById('btn-change-password').addEventListener('click', async function () {
  var pw = await Catetin.modal.prompt({ title: 'Kata Sandi Baru', placeholder: 'Minimal 6 karakter', type: 'password', confirmLabel: 'Ubah' });
  if (!pw) return;
  if (pw.length < 6) { Catetin.toast('Kata sandi minimal 6 karakter'); return; }
  var { error } = await Catetin.supabase.auth.updateUser({ password: pw });
  Catetin.toast(error ? 'Gagal ubah kata sandi' : 'Kata sandi diperbarui');
});
