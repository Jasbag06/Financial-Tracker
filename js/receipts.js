window.Catetin = window.Catetin || {};

Catetin.receiptPath = function (txnId) {
  return Catetin.state.user.id + '/' + txnId + '.jpg';
};

Catetin.uploadReceipt = async function (file, txnId) {
  var path = Catetin.receiptPath(txnId);
  var { error } = await Catetin.supabase.storage.from('receipts')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (error) { Catetin.toast('Failed to upload photo'); return null; }
  return path;
};

Catetin.deleteReceipt = async function (path) {
  if (!path) return;
  await Catetin.supabase.storage.from('receipts').remove([path]);
};

Catetin.getReceiptSignedUrl = async function (path) {
  var { data, error } = await Catetin.supabase.storage.from('receipts').createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
};

Catetin.showReceiptModal = async function (path) {
  Catetin.modal._show('<p class="modal-title">Receipt</p><p class="modal-msg">Loading…</p>', function () {});
  var url = await Catetin.getReceiptSignedUrl(path);
  if (!url) { Catetin.modal._hide(); Catetin.toast('Failed to load photo'); return; }
  var sheet = Catetin.modal._show(
    '<p class="modal-title">Receipt</p>'
    + '<img src="' + url + '" style="width:100%;border-radius:14px;margin-bottom:16px;display:block;" alt="Receipt photo">'
    + '<button type="button" class="cta ghost" id="modal-receipt-close">Close</button>',
    function () {}
  );
  sheet.querySelector('#modal-receipt-close').addEventListener('click', function () { Catetin.modal._hide(); });
};

// Shared by the Catat (Quick Add) attach box and the edit-transaction modal:
// wires a dashed "+ Photo" tile / file input / thumbnail-with-remove into a
// small self-contained widget. `onChange(file|null)` fires whenever the
// selection changes (file picked, or removed).
Catetin.setupReceiptPicker = function (opts) {
  var emptyEl = opts.emptyEl;
  var previewEl = opts.previewEl;
  var imgEl = opts.imgEl;
  var inputEl = opts.inputEl;
  var removeBtn = opts.removeBtn;
  var onChange = opts.onChange;

  function showEmpty() { emptyEl.hidden = false; previewEl.hidden = true; }
  function showPreview(src) { imgEl.src = src; emptyEl.hidden = true; previewEl.hidden = false; }

  emptyEl.addEventListener('click', function () { inputEl.click(); });
  inputEl.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    showPreview(URL.createObjectURL(file));
    onChange(file);
  });
  removeBtn.addEventListener('click', function () {
    inputEl.value = '';
    showEmpty();
    onChange(null);
  });

  return { showEmpty: showEmpty, showPreview: showPreview };
};
