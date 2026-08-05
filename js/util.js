window.Catetin = window.Catetin || {};

Catetin.fmtRp = function (n) {
  n = Math.round(Number(n) || 0);
  return 'Rp ' + n.toLocaleString('id-ID');
};

Catetin.fmtShort = function (n) {
  n = Number(n) || 0;
  var abs = Math.abs(n);
  if (abs >= 1000000) return (n / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1).replace('.', ',') + 'jt';
  if (abs >= 1000) return Math.round(n / 1000) + 'rb';
  return String(Math.round(n));
};

Catetin.fmtDateLabel = function (dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var yest = new Date(today); yest.setDate(yest.getDate() - 1);
  var dOnly = new Date(d); dOnly.setHours(0, 0, 0, 0);
  if (dOnly.getTime() === today.getTime()) return 'Hari ini';
  if (dOnly.getTime() === yest.getTime()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

Catetin.toast = function (msg) {
  var el = document.getElementById('global-toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(Catetin._toastTimer);
  Catetin._toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
};

Catetin.escapeHtml = function (s) {
  var div = document.createElement('div');
  div.textContent = s == null ? '' : String(s);
  return div.innerHTML;
};

Catetin.kindLabel = function (kind) {
  return { cash: 'Tunai', bank: 'Bank', ewallet: 'E-wallet', credit_card: 'Kartu Kredit', other: 'Lainnya' }[kind] || kind;
};
