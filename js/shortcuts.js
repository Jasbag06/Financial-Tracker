window.Catetin = window.Catetin || {};

Catetin.randomHex = function (numBytes) {
  var arr = new Uint8Array(numBytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
};

Catetin.getOrCreateShortcutToken = async function () {
  var uid = Catetin.state.user.id;
  var existing = await Catetin.supabase.from('shortcut_tokens').select('token').eq('user_id', uid).maybeSingle();
  if (existing.data && existing.data.token) return existing.data.token;
  var created = await Catetin.supabase.from('shortcut_tokens').insert({ user_id: uid }).select('token').single();
  return created.data ? created.data.token : null;
};

Catetin.regenerateShortcutToken = async function () {
  var uid = Catetin.state.user.id;
  var fresh = Catetin.randomHex(24);
  var updated = await Catetin.supabase.from('shortcut_tokens').update({ token: fresh }).eq('user_id', uid).select('token');
  if (updated.error || !updated.data || updated.data.length === 0) {
    var inserted = await Catetin.supabase.from('shortcut_tokens').insert({ user_id: uid, token: fresh });
    if (inserted.error) return null;
  }
  return fresh;
};

Catetin.showShortcutTokenModal = function (token) {
  var sheet = Catetin.modal._show(
    '<p class="modal-title">Shortcut Token</p>'
    + '<p class="modal-msg">Paste this into your iOS Shortcut as the <code>secret</code> field. Keep it private — anyone who has it can add fake transactions to your account (nothing else).</p>'
    + '<input type="text" id="modal-token-value" class="modal-input mono" value="' + Catetin.escapeHtml(token) + '" readonly style="font-size:12px;">'
    + '<div class="modal-actions">'
    + '<button type="button" class="cta ghost" id="modal-token-regen">Regenerate</button>'
    + '<button type="button" class="cta" id="modal-token-copy">Copy</button>'
    + '</div>'
    + '<button type="button" class="link" id="modal-token-close" style="display:block;margin:14px auto 0;">Close</button>',
    function () {}
  );

  sheet.querySelector('#modal-token-copy').addEventListener('click', async function () {
    var input = sheet.querySelector('#modal-token-value');
    input.select();
    try {
      await navigator.clipboard.writeText(input.value);
      Catetin.toast('Copied');
    } catch (e) {
      Catetin.toast('Select the text above and copy manually');
    }
  });

  sheet.querySelector('#modal-token-close').addEventListener('click', function () { Catetin.modal._hide(); });

  sheet.querySelector('#modal-token-regen').addEventListener('click', async function () {
    var ok = await Catetin.modal.confirm({
      title: 'Regenerate token?',
      message: 'Your existing Shortcut will stop working until you paste in the new token.',
      danger: true,
      confirmLabel: 'Regenerate'
    });
    if (!ok) return;
    var fresh = await Catetin.regenerateShortcutToken();
    if (!fresh) { Catetin.toast('Failed to regenerate'); return; }
    Catetin.showShortcutTokenModal(fresh);
  });
};

document.getElementById('btn-shortcut-token').addEventListener('click', async function () {
  var token = await Catetin.getOrCreateShortcutToken();
  if (!token) { Catetin.toast('Failed to load token'); return; }
  Catetin.showShortcutTokenModal(token);
});
