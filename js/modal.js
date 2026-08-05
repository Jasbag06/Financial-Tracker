window.Catetin = window.Catetin || {};

// iOS Safari silently no-ops window.alert/confirm/prompt when the app runs
// standalone (Add to Home Screen), so all confirmation/input dialogs go through
// this instead.
Catetin.modal = {};

Catetin.ICON_CHOICES = ['🍜', '🍔', '☕', '🛒', '🛍️', '👗', '🏠', '💡', '🧾', '🚗', '🛵', '🚌', '✈️', '🎮', '🎬', '📚', '💊', '🏥', '💇', '🐾', '🎁', '💼', '📥', '💰', '📱', '🎓', '⚽', '🧴', '🔧', '📦'];

Catetin.modal._onBackdropCancel = null;

Catetin.modal._show = function (innerHtml, onBackdropCancel) {
  var overlay = document.getElementById('modal-overlay');
  var sheet = document.getElementById('modal-sheet');
  sheet.innerHTML = innerHtml;
  overlay.hidden = false;
  Catetin.modal._onBackdropCancel = onBackdropCancel || null;
  return sheet;
};

Catetin.modal._hide = function () {
  document.getElementById('modal-overlay').hidden = true;
  Catetin.modal._onBackdropCancel = null;
};

document.getElementById('modal-overlay').addEventListener('click', function (e) {
  if (e.target !== this) return;
  var cancel = Catetin.modal._onBackdropCancel;
  Catetin.modal._hide();
  if (cancel) cancel();
});

Catetin.modal.confirm = function (opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var sheet = Catetin.modal._show(
      '<p class="modal-title">' + Catetin.escapeHtml(opts.title || 'Yakin?') + '</p>'
      + (opts.message ? '<p class="modal-msg">' + Catetin.escapeHtml(opts.message) + '</p>' : '')
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Batal</button>'
      + '<button type="button" class="cta' + (opts.danger ? '' : ' mint') + '" id="modal-ok"' + (opts.danger ? ' style="background:var(--coral);color:#fff;"' : '') + '>' + Catetin.escapeHtml(opts.confirmLabel || 'Ya') + '</button>'
      + '</div>',
      function () { resolve(false); }
    );
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(false); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () { Catetin.modal._hide(); resolve(true); });
  });
};

Catetin.modal.prompt = function (opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var sheet = Catetin.modal._show(
      '<p class="modal-title">' + Catetin.escapeHtml(opts.title || '') + '</p>'
      + '<input type="' + (opts.type || 'text') + '" id="modal-input" class="modal-input" placeholder="' + Catetin.escapeHtml(opts.placeholder || '') + '" value="' + Catetin.escapeHtml(opts.initialValue || '') + '">'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Batal</button>'
      + '<button type="button" class="cta" id="modal-ok">' + Catetin.escapeHtml(opts.confirmLabel || 'Simpan') + '</button>'
      + '</div>',
      function () { resolve(null); }
    );
    var input = sheet.querySelector('#modal-input');
    setTimeout(function () { input.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var v = input.value.trim();
      Catetin.modal._hide();
      resolve(v || null);
    });
  });
};

Catetin.modal.addCategory = function () {
  return new Promise(function (resolve) {
    var selected = Catetin.ICON_CHOICES[0];
    var sheet = Catetin.modal._show(
      '<p class="modal-title">Kategori Baru</p>'
      + '<input type="text" id="modal-cat-name" class="modal-input" placeholder="cth. Peliharaan">'
      + '<div class="icon-picker" id="modal-icon-picker">'
      + Catetin.ICON_CHOICES.map(function (ic, i) { return '<button type="button" data-icon="' + ic + '" class="' + (i === 0 ? 'active' : '') + '">' + ic + '</button>'; }).join('')
      + '</div>'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Batal</button>'
      + '<button type="button" class="cta" id="modal-ok">Tambah</button>'
      + '</div>',
      function () { resolve(null); }
    );
    sheet.querySelectorAll('#modal-icon-picker button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sheet.querySelectorAll('#modal-icon-picker button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selected = btn.dataset.icon;
      });
    });
    var nameInput = sheet.querySelector('#modal-cat-name');
    setTimeout(function () { nameInput.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      Catetin.modal._hide();
      resolve({ name: name, icon: selected });
    });
  });
};

Catetin.modal.editCategory = function (cat) {
  return new Promise(function (resolve) {
    var selected = cat.icon;
    var sheet = Catetin.modal._show(
      '<p class="modal-title">Ubah Kategori</p>'
      + '<input type="text" id="modal-cat-name" class="modal-input" value="' + Catetin.escapeHtml(cat.name) + '" placeholder="Nama kategori">'
      + '<div class="icon-picker" id="modal-icon-picker">'
      + Catetin.ICON_CHOICES.map(function (ic) { return '<button type="button" data-icon="' + ic + '" class="' + (ic === selected ? 'active' : '') + '">' + ic + '</button>'; }).join('')
      + '</div>'
      + '<input type="number" id="modal-cat-budget" class="modal-input" placeholder="Budget bulanan (opsional)" value="' + (cat.budget_monthly || '') + '" min="0" step="1000">'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Batal</button>'
      + '<button type="button" class="cta" id="modal-ok">Simpan</button>'
      + '</div>',
      function () { resolve(null); }
    );
    sheet.querySelectorAll('#modal-icon-picker button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        sheet.querySelectorAll('#modal-icon-picker button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        selected = btn.dataset.icon;
      });
    });
    var nameInput = sheet.querySelector('#modal-cat-name');
    setTimeout(function () { nameInput.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      var budgetVal = sheet.querySelector('#modal-cat-budget').value;
      Catetin.modal._hide();
      resolve({ name: name, icon: selected, budget_monthly: budgetVal ? Number(budgetVal) : null });
    });
  });
};

Catetin.modal.editTransaction = function (t) {
  return new Promise(function (resolve) {
    var sheet = Catetin.modal._show(
      '<p class="modal-title">Ubah Transaksi</p>'
      + '<label class="field" style="text-align:left;"><span style="font-size:11.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:5px;">Jumlah</span><input type="number" id="modal-amt" class="modal-input" value="' + Number(t.amount) + '" style="margin-bottom:12px;"></label>'
      + '<label class="field" style="text-align:left;"><span style="font-size:11.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:5px;">Catatan</span><input type="text" id="modal-note" class="modal-input" value="' + Catetin.escapeHtml(t.note || '') + '"></label>'
      + '<div class="modal-actions">'
      + '<button type="button" class="cta ghost" id="modal-cancel">Batal</button>'
      + '<button type="button" class="cta" id="modal-ok">Simpan</button>'
      + '</div>',
      function () { resolve(null); }
    );
    var amtInput = sheet.querySelector('#modal-amt');
    setTimeout(function () { amtInput.focus(); }, 50);
    sheet.querySelector('#modal-cancel').addEventListener('click', function () { Catetin.modal._hide(); resolve(null); });
    sheet.querySelector('#modal-ok').addEventListener('click', function () {
      var amount = Number(amtInput.value);
      if (!amount || amount <= 0) { amtInput.focus(); return; }
      var note = sheet.querySelector('#modal-note').value.trim();
      Catetin.modal._hide();
      resolve({ amount: amount, note: note || null });
    });
  });
};
