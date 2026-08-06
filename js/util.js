window.Catetin = window.Catetin || {};

Catetin.fmtRp = function (n) {
  n = Math.round(Number(n) || 0);
  return 'Rp ' + n.toLocaleString('id-ID');
};

Catetin.fmtShort = function (n) {
  n = Number(n) || 0;
  var abs = Math.abs(n);
  if (abs >= 1000000) return (n / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1) + 'M';
  if (abs >= 1000) return Math.round(n / 1000) + 'K';
  return String(Math.round(n));
};

Catetin.fmtDateLabel = function (dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var yest = new Date(today); yest.setDate(yest.getDate() - 1);
  var dOnly = new Date(d); dOnly.setHours(0, 0, 0, 0);
  if (dOnly.getTime() === today.getTime()) return 'Today';
  if (dOnly.getTime() === yest.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Always a concrete date (never "Today"/"Yesterday") - used where a relative
// label would leave a transaction looking like it has no real date.
Catetin.fmtDateShort = function (dateStr) {
  var d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
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
  return { cash: 'Cash', bank: 'Bank', ewallet: 'E-wallet', credit_card: 'Credit Card', other: 'Other' }[kind] || kind;
};
