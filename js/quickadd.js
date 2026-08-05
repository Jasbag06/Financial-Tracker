window.Catetin = window.Catetin || {};

Catetin.quickadd = { step: 0, type: 'expense', amountStr: '0', category: null, account: null, recurring: false, tripId: null };

Catetin.router.onEnter.catat = function () { Catetin.quickadd.reset(); };

Catetin.quickadd.reset = function () {
  var qa = Catetin.quickadd;
  qa.type = 'expense';
  qa.amountStr = '0';
  qa.category = null;
  qa.account = null;
  qa.recurring = false;
  qa.tripId = null;

  document.getElementById('amount-display').textContent = '0';
  document.querySelectorAll('#type-toggle .opt').forEach(function (b) {
    b.classList.toggle('active', b.dataset.type === 'expense');
    b.style.color = b.dataset.type === 'expense' ? 'var(--coral-ink)' : '';
  });
  document.getElementById('btn-catat-next').disabled = true;
  document.getElementById('txn-note').value = '';
  document.querySelectorAll('#recurring-row .chip').forEach(function (c) { c.classList.toggle('active', c.dataset.recurring === 'false'); });

  Catetin.quickadd.renderCategoryGrid();
  Catetin.quickadd.layoutTrack();
  Catetin.quickadd.goStep(0, true);
};

// Pixel-based sizing (instead of width:300% / 33.3333%) sidesteps an iOS Safari bug
// where overflow:hidden fails to clip a percentage-widthed flex child under a CSS
// transform, which made all 3 steps render side-by-side instead of sliding.
Catetin.quickadd.layoutTrack = function () {
  var viewport = document.getElementById('catat-viewport');
  var track = document.getElementById('catat-track');
  var steps = track.querySelectorAll('.catat-step');
  var w = viewport.clientWidth;
  track.style.width = (w * steps.length) + 'px';
  steps.forEach(function (step) { step.style.width = w + 'px'; });
  Catetin.quickadd._stepWidth = w;
};

Catetin.quickadd.goStep = function (n, noAnim) {
  n = Math.max(0, Math.min(2, n));
  Catetin.quickadd.step = n;
  var track = document.getElementById('catat-track');
  var w = Catetin.quickadd._stepWidth || document.getElementById('catat-viewport').clientWidth;
  if (noAnim) track.classList.add('no-anim');
  track.style.transform = 'translateX(-' + (n * w) + 'px)';
  if (noAnim) {
    requestAnimationFrame(function () { requestAnimationFrame(function () { track.classList.remove('no-anim'); }); });
  }
};

window.addEventListener('resize', function () {
  if (Catetin.router.current !== 'catat') return;
  Catetin.quickadd.layoutTrack();
  Catetin.quickadd.goStep(Catetin.quickadd.step, true);
});

document.getElementById('type-toggle').addEventListener('click', function (e) {
  var btn = e.target.closest('.opt'); if (!btn) return;
  Catetin.quickadd.type = btn.dataset.type;
  document.querySelectorAll('#type-toggle .opt').forEach(function (b) { b.classList.remove('active'); b.style.color = ''; });
  btn.classList.add('active');
  btn.style.color = btn.dataset.type === 'expense' ? 'var(--coral-ink)' : 'var(--mint-ink)';
  Catetin.quickadd.renderCategoryGrid();
});

document.getElementById('keypad').addEventListener('click', function (e) {
  var btn = e.target.closest('.key'); if (!btn) return;
  var k = btn.dataset.key;
  var cur = Catetin.quickadd.amountStr;
  if (k === 'back') {
    cur = cur.length > 1 ? cur.slice(0, -1) : '0';
  } else {
    if (cur === '0') cur = '';
    cur = cur + k;
    if (cur.length > 12) cur = cur.slice(0, 12);
  }
  Catetin.quickadd.amountStr = cur || '0';
  document.getElementById('amount-display').textContent = Number(Catetin.quickadd.amountStr).toLocaleString('id-ID');
  document.getElementById('btn-catat-next').disabled = Number(Catetin.quickadd.amountStr) <= 0;
});

document.getElementById('btn-catat-next').addEventListener('click', function () {
  Catetin.quickadd.updateCatReminder();
  Catetin.quickadd.goStep(1);
});
document.querySelectorAll('[data-catat-back]').forEach(function (btn) {
  btn.addEventListener('click', function () { Catetin.quickadd.goStep(Catetin.quickadd.step - 1); });
});
document.getElementById('btn-catat-close').addEventListener('click', function () { Catetin.router.go('dashboard'); });
document.getElementById('btn-catat-scan').addEventListener('click', function () { Catetin.router.go('scan'); });

Catetin.quickadd.renderCategoryGrid = function () {
  var cats = Catetin.state.categories.filter(function (c) { return c.type === Catetin.quickadd.type; });
  var grid = document.getElementById('cat-grid');
  grid.innerHTML = cats.map(function (c) {
    return '<div class="cat-tile" data-cat-name="' + Catetin.escapeHtml(c.name) + '"><div class="ic" style="background:var(--surface-2);">' + c.icon + '</div><span>' + Catetin.escapeHtml(c.name) + '</span></div>';
  }).join('') + '<div class="cat-tile add-tile" style="border-style:dashed;" id="btn-add-cat-inline"><div class="ic" style="background:var(--surface-2);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg></div><span>Tambah</span></div>';

  grid.querySelectorAll('.cat-tile:not(.add-tile)').forEach(function (tile) {
    tile.addEventListener('click', function () {
      grid.querySelectorAll('.cat-tile').forEach(function (t) { t.classList.remove('active'); });
      tile.classList.add('active');
      Catetin.quickadd.category = tile.dataset.catName;
      Catetin.quickadd.updateCatReminder();
      Catetin.quickadd.renderAccountChips();
      Catetin.quickadd.renderTripChips();
      setTimeout(function () { Catetin.quickadd.goStep(2); }, 220);
    });
  });

  document.getElementById('btn-add-cat-inline').addEventListener('click', async function () {
    var name = window.prompt('Nama kategori baru:');
    if (!name) return;
    var icon = window.prompt('Ikon emoji (cth. 🐾):', '📦') || '📦';
    var { error } = await Catetin.supabase.from('categories').insert({
      user_id: Catetin.state.user.id, name: name.trim(), type: Catetin.quickadd.type, icon: icon,
      sort_order: cats.length + 1
    });
    if (error) { Catetin.toast('Gagal menambah kategori'); return; }
    await Catetin.reloadAll();
    Catetin.quickadd.renderCategoryGrid();
  });
};

Catetin.quickadd.renderAccountChips = function () {
  var row = document.getElementById('pay-acct-row');
  var accounts = Catetin.state.accounts;
  row.innerHTML = accounts.map(function (a, i) {
    return '<div class="acct-chip' + (i === 0 ? ' active' : '') + '" data-acct-name="' + Catetin.escapeHtml(a.name) + '"><span class="dot-badge" style="background:var(--' + a.color + ');">' + a.name.slice(0, 2).toUpperCase() + '</span> ' + Catetin.escapeHtml(a.name) + '</div>';
  }).join('');
  Catetin.quickadd.account = accounts.length ? accounts[0].name : null;
  row.querySelectorAll('.acct-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      row.querySelectorAll('.acct-chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      Catetin.quickadd.account = chip.dataset.acctName;
    });
  });
};

Catetin.quickadd.renderTripChips = function () {
  var row = document.getElementById('txn-trip-row');
  var trips = Catetin.upcomingTrips();
  row.innerHTML = '<button type="button" class="chip active" data-trip-id="" style="flex:none;">Umum</button>'
    + trips.map(function (tr) { return '<button type="button" class="chip" data-trip-id="' + tr.id + '" style="flex:none;">' + tr.icon + ' ' + Catetin.escapeHtml(tr.name) + '</button>'; }).join('')
    + '<button type="button" class="chip" data-trip-id="new" style="flex:none;">+ Baru</button>';
  Catetin.quickadd.tripId = null;

  row.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', async function () {
      if (chip.dataset.tripId === 'new') {
        var name = window.prompt('Nama acara baru (cth. Pergi ke Bandung):');
        if (!name) return;
        var { data, error } = await Catetin.supabase.from('trips').insert({
          user_id: Catetin.state.user.id, name: name.trim(), icon: '🧳', start_date: new Date().toISOString().slice(0, 10)
        }).select().single();
        if (error) { Catetin.toast('Gagal membuat acara'); return; }
        await Catetin.reloadAll();
        Catetin.quickadd.renderTripChips();
        Catetin.quickadd.tripId = data.id;
        var newChip = row.querySelector('[data-trip-id="' + data.id + '"]');
        row.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        if (newChip) newChip.classList.add('active');
        return;
      }
      row.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      Catetin.quickadd.tripId = chip.dataset.tripId || null;
    });
  });
};

document.getElementById('recurring-row').addEventListener('click', function (e) {
  var chip = e.target.closest('.chip'); if (!chip) return;
  document.querySelectorAll('#recurring-row .chip').forEach(function (c) { c.classList.remove('active'); });
  chip.classList.add('active');
  Catetin.quickadd.recurring = chip.dataset.recurring === 'true';
});

Catetin.quickadd.updateCatReminder = function () {
  var amt = Catetin.fmtRp(Number(Catetin.quickadd.amountStr));
  var typeLabel = Catetin.quickadd.type === 'expense' ? 'Pengeluaran' : 'Pemasukan';
  document.getElementById('cat-reminder').innerHTML = '<span style="color:' + (Catetin.quickadd.type === 'expense' ? 'var(--coral-ink)' : 'var(--mint-ink)') + ';">●</span> ' + amt + ' · ' + typeLabel;
  if (Catetin.quickadd.category) {
    var cat = Catetin.state.categories.find(function (c) { return c.name === Catetin.quickadd.category; });
    document.getElementById('pay-reminder').innerHTML = (cat ? cat.icon : '') + ' ' + amt + ' · ' + Catetin.escapeHtml(Catetin.quickadd.category);
  }
};

document.getElementById('btn-save-txn').addEventListener('click', async function () {
  var qa = Catetin.quickadd;
  if (!qa.category || !qa.account || Number(qa.amountStr) <= 0) { Catetin.toast('Lengkapi data dulu'); return; }
  var btn = this; btn.disabled = true;
  var { error } = await Catetin.supabase.from('transactions').insert({
    user_id: Catetin.state.user.id,
    occurred_at: new Date().toISOString().slice(0, 10),
    type: qa.type,
    amount: Number(qa.amountStr),
    category: qa.category,
    payment_source: qa.account,
    note: document.getElementById('txn-note').value.trim() || null,
    is_recurring: qa.recurring,
    trip_id: qa.tripId || null
  });
  btn.disabled = false;
  if (error) { Catetin.toast('Gagal menyimpan'); return; }
  await Catetin.reloadAll();
  var toastEl = document.getElementById('catat-toast');
  toastEl.classList.add('show');
  setTimeout(function () {
    toastEl.classList.remove('show');
    Catetin.quickadd.reset();
  }, 900);
});
