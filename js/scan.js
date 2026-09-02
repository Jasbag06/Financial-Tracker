window.Catetin = window.Catetin || {};

Catetin.scan = { ocrText: '', confidence: 0, items: [] };

Catetin.router.onEnter.scan = function () {
  Catetin.scan.photoFile = null;
  document.getElementById('scan-caption').textContent = 'Point camera at receipt';
};

function catetinTriggerInput(id) { document.getElementById(id).click(); }

document.getElementById('btn-scan-shutter').addEventListener('click', function () { catetinTriggerInput('scan-input-camera'); });
document.getElementById('btn-scan-gallery').addEventListener('click', function () { catetinTriggerInput('scan-input-gallery'); });
document.getElementById('btn-scan-close').addEventListener('click', function () { Catetin.router.go('catat'); });
document.getElementById('btn-scan-result-back').addEventListener('click', function () { Catetin.router.go('scan'); });
document.getElementById('btn-scan-from-dashboard').addEventListener('click', function () { Catetin.router.go('scan'); });

['scan-input-camera', 'scan-input-gallery'].forEach(function (id) {
  document.getElementById(id).addEventListener('change', async function (e) {
    var file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    await Catetin.scan.process(file);
  });
});

Catetin.scan.process = async function (file) {
  Catetin.scan.photoFile = file;
  var progressEl = document.getElementById('scan-progress');
  progressEl.hidden = false;
  progressEl.textContent = 'Reading receipt... 0%';
  try {
    var result = await Tesseract.recognize(file, 'eng', {
      logger: function (m) {
        if (m.status === 'recognizing text') {
          progressEl.textContent = 'Reading receipt... ' + Math.round(m.progress * 100) + '%';
        }
      }
    });
    Catetin.scan.ocrText = result.data.text || '';
    Catetin.scan.confidence = result.data.confidence || 0;
  } catch (err) {
    Catetin.toast('Failed to read receipt, please fill in manually');
    Catetin.scan.ocrText = '';
    Catetin.scan.confidence = 0;
  }
  progressEl.hidden = true;
  Catetin.scan.openResult();
};

// Best-effort heuristic parser: OCR of thermal receipts is noisy, so results are
// always shown for manual correction rather than trusted outright.
Catetin.scan.parse = function (text) {
  var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  var numberRe = /(\d{1,3}(?:[.,]\d{3})+|\d{4,})/;
  var items = [];
  var total = 0;

  lines.forEach(function (line) {
    var m = line.match(numberRe);
    if (!m) return;
    var raw = m[0].replace(/[.,]/g, '');
    var num = Number(raw);
    if (!num || num <= 0) return;
    var label = line.slice(0, m.index).trim().replace(/[-:x]+$/i, '').trim();
    var upper = line.toUpperCase();
    if (/TOTAL|JUMLAH/.test(upper) && !/SUB\s*TOTAL/.test(upper)) { total = num; return; }
    if (label.length >= 2 && !/SUBTOTAL|PPN|TAX|CASH|TUNAI|KEMBALI|CHANGE|DISKON/i.test(label)) {
      items.push({ name: label, amount: num });
    }
  });

  if (!total) total = items.reduce(function (s, i) { return s + i.amount; }, 0);

  var merchant = lines.find(function (l) { return l.length >= 3 && /[A-Za-z]/.test(l) && !numberRe.test(l); }) || '';

  var dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  var dateStr = new Date().toISOString().slice(0, 10);
  if (dateMatch) {
    var dd = dateMatch[1].padStart(2, '0'), mm = dateMatch[2].padStart(2, '0');
    var yy = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
    dateStr = yy + '-' + mm + '-' + dd;
  }

  return { merchant: merchant, date: dateStr, items: items.slice(0, 12), total: total };
};

Catetin.scan.openResult = function () {
  var parsed = Catetin.scan.parse(Catetin.scan.ocrText);
  document.getElementById('scan-merchant').value = parsed.merchant;
  document.getElementById('scan-date').value = parsed.date;
  document.getElementById('scan-accuracy').textContent = Catetin.scan.confidence ? ('~' + Math.round(Catetin.scan.confidence) + '% accurate') : 'Fill manually';

  var accSel = document.getElementById('scan-account');
  accSel.innerHTML = Catetin.state.accounts.map(function (a) { return '<option value="' + Catetin.escapeHtml(a.name) + '">' + Catetin.escapeHtml(a.name) + '</option>'; }).join('');

  var catSel = document.getElementById('scan-category');
  var expenseCats = Catetin.state.categories.filter(function (c) { return c.type === 'expense'; });
  catSel.innerHTML = expenseCats.map(function (c) { return '<option value="' + Catetin.escapeHtml(c.name) + '">' + c.icon + ' ' + Catetin.escapeHtml(c.name) + '</option>'; }).join('');
  var shopping = expenseCats.find(function (c) { return /shopping|belanja/i.test(c.name); });
  if (shopping) catSel.value = shopping.name;

  var tripSel = document.getElementById('scan-trip');
  tripSel.innerHTML = '<option value="">General</option>' + Catetin.upcomingTrips().map(function (tr) {
    return '<option value="' + tr.id + '">' + tr.icon + ' ' + Catetin.escapeHtml(tr.name) + '</option>';
  }).join('');

  Catetin.scan.items = parsed.items.length ? parsed.items : [{ name: 'Total Purchase', amount: parsed.total }];
  Catetin.scan.renderItems();
  Catetin.router.go('scan-result');
};

Catetin.scan.renderItems = function () {
  var el = document.getElementById('scan-items-list');
  el.innerHTML = Catetin.scan.items.map(function (item, i) {
    return '<div class="item-row"><input type="text" value="' + Catetin.escapeHtml(item.name) + '" data-item-name="' + i + '">'
      + '<input type="number" inputmode="numeric" class="mono item-amt" value="' + item.amount + '" data-item-amt="' + i + '">'
      + '<button type="button" class="item-remove" data-item-remove="' + i + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>';
  }).join('');

  el.querySelectorAll('[data-item-name]').forEach(function (inp) {
    inp.addEventListener('input', function () { Catetin.scan.items[Number(inp.dataset.itemName)].name = inp.value; });
  });
  el.querySelectorAll('[data-item-amt]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      Catetin.scan.items[Number(inp.dataset.itemAmt)].amount = Number(inp.value) || 0;
      Catetin.scan.updateTotal();
    });
  });
  el.querySelectorAll('[data-item-remove]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      Catetin.scan.items.splice(Number(btn.dataset.itemRemove), 1);
      Catetin.scan.renderItems();
      Catetin.scan.updateTotal();
    });
  });
  Catetin.scan.updateTotal();
};

Catetin.scan.updateTotal = function () {
  var total = Catetin.scan.items.reduce(function (s, i) { return s + (Number(i.amount) || 0); }, 0);
  document.getElementById('scan-total').textContent = Catetin.fmtRp(total);
};

document.getElementById('btn-scan-add-item').addEventListener('click', function () {
  Catetin.scan.items.push({ name: '', amount: 0 });
  Catetin.scan.renderItems();
});

document.getElementById('btn-scan-save').addEventListener('click', async function () {
  var total = Catetin.scan.items.reduce(function (s, i) { return s + (Number(i.amount) || 0); }, 0);
  if (total <= 0) { Catetin.toast('Total is not valid'); return; }
  if (!Catetin.state.accounts.length) { Catetin.toast('Add a bank account first in Settings'); return; }
  var merchant = document.getElementById('scan-merchant').value.trim();
  var btn = this; btn.disabled = true;

  var txnId = crypto.randomUUID();
  var receiptPath = Catetin.scan.photoFile ? await Catetin.uploadReceipt(Catetin.scan.photoFile, txnId) : null;

  var { error } = await Catetin.supabase.from('transactions').insert({
    id: txnId,
    user_id: Catetin.state.user.id,
    occurred_at: document.getElementById('scan-date').value || new Date().toISOString().slice(0, 10),
    type: 'expense',
    amount: total,
    category: document.getElementById('scan-category').value,
    payment_source: document.getElementById('scan-account').value,
    note: merchant || null,
    is_recurring: false,
    trip_id: document.getElementById('scan-trip').value || null,
    receipt_url: receiptPath
  });
  btn.disabled = false;
  if (error) { Catetin.toast('Failed to save'); return; }
  await Catetin.reloadAll();
  Catetin.toast('Saved as expense');
  Catetin.router.go('dashboard');
});
