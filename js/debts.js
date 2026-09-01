window.Catetin = window.Catetin || {};

Catetin.debts = { direction: 'owed_to_me', newDirection: 'owed_to_me', newAccount: null };
Catetin.currentDebtPerson = null;

// ---------------------------------------------------------------- home card

Catetin.renderHomeDebts = function () {
  var people = Catetin.debtPeople('owed_to_me').filter(function (p) { return p.outstanding > 0; });
  var el = document.getElementById('home-debt-card');
  if (!el) return;

  if (people.length === 0) {
    el.innerHTML = '<div class="card" data-nav="debts" style="padding:15px;display:flex;align-items:center;gap:11px;cursor:pointer;">'
      + '<div class="icon-chip" style="background:var(--surface-2);">🤝</div>'
      + '<div style="flex:1;"><div style="font-size:13.5px;font-weight:600;">No one owes you right now</div>'
      + '<div class="muted" style="font-size:11.5px;">Tap to record a debt</div></div>'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></div>';
    return;
  }

  var total = people.reduce(function (s, p) { return s + p.outstanding; }, 0);
  var top = people.slice(0, 3);

  var html = '<div class="card" style="padding:14px 15px;">'
    + '<div class="between" style="align-items:flex-end;">'
    + '<div><div class="muted" style="font-size:11.5px;">Still unpaid</div>'
    + '<div class="mono" style="font-size:21px;font-weight:700;margin-top:2px;color:var(--coral-ink);">'
    + '<span class="real">' + Catetin.fmtRp(total) + '</span><span class="masked">Rp •• •••</span></div></div>'
    + '<span class="pill" style="background:#FBE1E1;color:var(--coral-ink);">' + people.length + (people.length > 1 ? ' people' : ' person') + '</span>'
    + '</div><hr class="divider" style="margin:11px 0 2px;"/>';

  top.forEach(function (p, i) {
    html += Catetin.debtPersonRowHtml(p) + (i === top.length - 1 ? '' : '<hr class="divider"/>');
  });

  if (people.length > 3) {
    html += '<hr class="divider"/><button type="button" class="link" data-nav="debts" style="width:100%;text-align:center;padding:11px 0;">+ ' + (people.length - 3) + ' more</button>';
  }
  el.innerHTML = html + '</div>';
};

// Shared by the home card and the Debts list - one row per person, since the
// same person borrowing three times should read as one debtor, not three.
Catetin.debtPersonRowHtml = function (p) {
  var settled = p.outstanding <= 0;
  var sub;
  if (settled) {
    sub = 'Settled';
  } else if (p.overdue > 0) {
    sub = '<span style="color:var(--coral-ink);font-weight:600;">' + p.overdue + ' day' + (p.overdue > 1 ? 's' : '') + ' overdue</span>';
  } else {
    var withDue = p.debts.filter(function (d) { return d.due_date && !Catetin.debtIsSettled(d); })
      .sort(function (a, b) { return a.due_date.localeCompare(b.due_date); });
    if (withDue.length) sub = 'Due ' + Catetin.fmtDateShort(withDue[0].due_date);
    else if (p.debts.length > 1) sub = p.debts.length + ' debts';
    else sub = p.debts[0].note ? Catetin.escapeHtml(p.debts[0].note) : Catetin.fmtDateShort(p.debts[0].occurred_at);
  }

  return '<div class="txn" data-nav="debt-detail" data-debt-person="' + Catetin.escapeHtml(p.name) + '" style="cursor:pointer;">'
    + '<div class="debt-avatar" style="background:var(--' + Catetin.debtColor(p.name) + ');">' + Catetin.escapeHtml(Catetin.debtInitials(p.name)) + '</div>'
    + '<div class="meta"><div class="cat">' + Catetin.escapeHtml(p.name) + '</div><div class="sub">' + sub + '</div></div>'
    + '<div class="amt mono" style="color:' + (settled ? 'var(--mint-ink)' : 'var(--coral-ink)') + ';">'
    + '<span class="real">' + Catetin.fmtRp(settled ? p.total : p.outstanding) + '</span><span class="masked">Rp •• •••</span></div></div>';
};

// ------------------------------------------------------------- debts list

Catetin.router.onEnter.debts = function () {
  Catetin.debts.direction = 'owed_to_me';
  document.querySelectorAll('#debt-direction-toggle .opt').forEach(function (b) {
    b.classList.toggle('active', b.dataset.direction === 'owed_to_me');
  });
  Catetin.renderDebts();
};

document.getElementById('debt-direction-toggle').addEventListener('click', function (e) {
  var btn = e.target.closest('.opt'); if (!btn) return;
  document.querySelectorAll('#debt-direction-toggle .opt').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  Catetin.debts.direction = btn.dataset.direction;
  Catetin.renderDebts();
});

Catetin.renderDebts = function () {
  var dir = Catetin.debts.direction;
  var incoming = dir === 'owed_to_me';
  var people = Catetin.debtPeople(dir);
  var debts = Catetin.debtsByDirection(dir);

  var outstanding = Catetin.debtOutstandingTotal(dir);
  var lent = debts.reduce(function (s, d) { return s + Number(d.amount); }, 0);
  var paid = lent - outstanding;
  var pct = lent > 0 ? Math.round(paid / lent * 100) : 0;

  var card = document.getElementById('debt-total-card');
  card.innerHTML = '<div class="muted" style="font-size:11.5px;">' + (incoming ? 'Total still unpaid' : 'Total I still owe') + '</div>'
    + '<div class="mono" style="font-size:24px;font-weight:700;margin-top:3px;color:' + (outstanding > 0 ? 'var(--coral-ink)' : 'var(--mint-ink)') + ';">'
    + '<span class="real">' + Catetin.fmtRp(outstanding) + '</span><span class="masked">Rp •• •••</span></div>'
    + (lent > 0
      ? '<div class="budget-track"><div class="budget-fill" style="width:' + pct + '%;background:var(--mint);"></div></div>'
        + '<div class="between muted mono" style="font-size:10.5px;margin-top:5px;"><span>' + Catetin.fmtRp(paid) + (incoming ? ' received' : ' paid') + '</span><span>of ' + Catetin.fmtRp(lent) + '</span></div>'
      : '');

  var unsettled = people.filter(function (p) { return p.outstanding > 0; });
  var settled = people.filter(function (p) { return p.outstanding <= 0; });

  var html = '';
  if (people.length === 0) {
    html = '<div class="empty-state">' + (incoming ? 'No one owes you anything yet.' : 'You don\'t owe anyone yet.') + '<br>Tap + to record one.</div>';
  } else {
    if (unsettled.length) {
      html += '<div class="section-title">Unpaid</div><div class="card" style="padding:6px 16px;">';
      unsettled.forEach(function (p, i) { html += Catetin.debtPersonRowHtml(p) + (i === unsettled.length - 1 ? '' : '<hr class="divider"/>'); });
      html += '</div>';
    }
    if (settled.length) {
      html += '<div class="section-title">Settled</div><div class="card" style="padding:6px 16px;opacity:.62;">';
      settled.forEach(function (p, i) { html += Catetin.debtPersonRowHtml(p) + (i === settled.length - 1 ? '' : '<hr class="divider"/>'); });
      html += '</div>';
    }
  }
  document.getElementById('debts-list').innerHTML = html;
  Catetin.applyMaskState();
};

// ------------------------------------------------------------ new debt form

Catetin.router.onEnter['add-debt'] = function () {
  var f = document.getElementById('add-debt-form');
  f.reset();
  Catetin.debts.newDirection = Catetin.debts.direction;
  document.querySelectorAll('#new-debt-direction .opt').forEach(function (b) {
    b.classList.toggle('active', b.dataset.direction === Catetin.debts.newDirection);
  });
  document.getElementById('new-debt-date').value = new Date().toISOString().slice(0, 10);
  Catetin.debts.newAccount = null;
  Catetin.renderDebtAccountChips();
  Catetin.renderDebtSuggestions('');
};

document.getElementById('new-debt-direction').addEventListener('click', function (e) {
  var btn = e.target.closest('.opt'); if (!btn) return;
  document.querySelectorAll('#new-debt-direction .opt').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  Catetin.debts.newDirection = btn.dataset.direction;
});

Catetin.renderDebtAccountChips = function () {
  var row = document.getElementById('new-debt-acct-row');
  row.innerHTML = Catetin.state.accounts.map(function (a) {
    return '<button type="button" class="chip" data-debt-acct="' + Catetin.escapeHtml(a.name) + '" style="flex:none;">' + Catetin.escapeHtml(a.name) + '</button>';
  }).join('');
  row.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var already = chip.classList.contains('active');
      row.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      if (already) { Catetin.debts.newAccount = null; return; }
      chip.classList.add('active');
      Catetin.debts.newAccount = chip.dataset.debtAcct;
    });
  });
};

// Suggests people already on record as you type, so the same person always
// lands under one name instead of "Budi" / "budi " / "Budi S" separately.
Catetin.renderDebtSuggestions = function (query) {
  var row = document.getElementById('debt-person-suggest');
  var q = String(query || '').trim().toLowerCase();
  var names = Catetin.debtNames().filter(function (n) {
    return !q || (n.toLowerCase().indexOf(q) !== -1 && n.toLowerCase() !== q);
  }).slice(0, 5);

  row.innerHTML = names.map(function (n) {
    return '<button type="button" class="chip" data-suggest-name="' + Catetin.escapeHtml(n) + '" style="flex:none;">' + Catetin.escapeHtml(n) + '</button>';
  }).join('');

  row.querySelectorAll('[data-suggest-name]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.getElementById('new-debt-person').value = chip.dataset.suggestName;
      Catetin.renderDebtSuggestions(chip.dataset.suggestName);
    });
  });
};

document.getElementById('new-debt-person').addEventListener('input', function () {
  Catetin.renderDebtSuggestions(this.value);
});

document.getElementById('add-debt-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  var amount = Number(document.getElementById('new-debt-amount').value);
  var person = document.getElementById('new-debt-person').value.trim();
  if (!amount || amount <= 0 || !person) { Catetin.toast('Please fill in all fields'); return; }

  var { error } = await Catetin.supabase.from('debts').insert({
    user_id: Catetin.state.user.id,
    person_name: person,
    direction: Catetin.debts.newDirection,
    amount: amount,
    note: document.getElementById('new-debt-note').value.trim() || null,
    occurred_at: document.getElementById('new-debt-date').value || new Date().toISOString().slice(0, 10),
    due_date: document.getElementById('new-debt-due').value || null,
    payment_source: Catetin.debts.newAccount
  });
  if (error) { Catetin.toast('Failed to save'); return; }

  await Catetin.reloadAll();
  Catetin.debts.direction = Catetin.debts.newDirection;
  Catetin.toast('Debt saved');
  Catetin.router.go('debts');
});

// ---------------------------------------------------------- person detail

Catetin.router.onEnter['debt-detail'] = function () { Catetin.renderDebtDetail(); };

Catetin.renderDebtDetail = function () {
  var name = Catetin.currentDebtPerson;
  var person = Catetin.debtPeople(Catetin.debts.direction).find(function (p) { return p.name === name; });
  if (!person) { Catetin.router.go('debts'); return; }

  var incoming = Catetin.debts.direction === 'owed_to_me';
  var settled = person.outstanding <= 0;

  document.getElementById('debt-detail-name').textContent = person.name;
  document.getElementById('debt-detail-label').textContent = settled
    ? 'Fully settled'
    : (incoming ? 'Still owed to you' : 'You still owe');

  var totalEl = document.getElementById('debt-detail-total');
  totalEl.textContent = Catetin.fmtRp(settled ? person.total : person.outstanding);
  totalEl.style.color = settled ? 'var(--mint-ink)' : 'var(--coral-ink)';
  document.getElementById('debt-detail-sub').textContent = person.debts.length > 1
    ? person.debts.length + ' debts · ' + Catetin.fmtRp(person.total) + ' total'
    : '';

  var debts = person.debts.slice().sort(function (a, b) {
    var aS = Catetin.debtIsSettled(a) ? 1 : 0, bS = Catetin.debtIsSettled(b) ? 1 : 0;
    if (aS !== bS) return aS - bS;
    return b.occurred_at.localeCompare(a.occurred_at);
  });

  document.getElementById('debt-detail-list').innerHTML = debts.map(function (d) {
    var paid = Catetin.debtPaid(d.id);
    var remaining = Catetin.debtRemaining(d);
    var isSettled = Catetin.debtIsSettled(d);
    var overdue = Catetin.debtDaysOverdue(d);
    var pct = Math.min(100, Math.round(paid / Number(d.amount) * 100));
    var payments = Catetin.debtPaymentsFor(d.id).slice().sort(function (a, b) { return a.paid_at.localeCompare(b.paid_at); });

    var chip = '';
    if (isSettled) {
      chip = '<span class="pill" style="background:#E1F2EA;color:var(--mint-ink);">Settled ' + Catetin.fmtDateShort(Catetin.debtSettledDate(d)) + '</span>';
    } else if (overdue > 0) {
      chip = '<span class="pill" style="background:#FBE1E1;color:var(--coral-ink);">' + overdue + ' day' + (overdue > 1 ? 's' : '') + ' overdue</span>';
    } else if (d.due_date) {
      chip = '<span class="pill" style="background:#FBEEDA;color:var(--yellow-ink);">Due ' + Catetin.fmtDateShort(d.due_date) + '</span>';
    }

    var html = '<div class="debt-card' + (isSettled ? ' settled' : '') + '">'
      + '<div class="between" style="align-items:flex-start;gap:10px;">'
      + '<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:600;">' + (d.note ? Catetin.escapeHtml(d.note) : 'No note') + '</div>'
      + '<div class="muted" style="font-size:11.5px;margin-top:2px;">' + Catetin.fmtDateShort(d.occurred_at) + (d.payment_source ? ' · ' + Catetin.escapeHtml(d.payment_source) : '') + '</div></div>'
      + '<button type="button" class="link" data-debt-del="' + d.id + '" style="color:var(--coral-ink);flex:none;">Delete</button></div>';

    if (!isSettled) {
      html += '<div class="mono" style="font-size:19px;font-weight:700;margin-top:10px;color:var(--coral-ink);">' + Catetin.fmtRp(remaining) + '</div>';
    }
    html += '<div class="budget-track"><div class="budget-fill" style="width:' + pct + '%;background:var(--' + (isSettled ? 'mint' : pct > 0 ? 'mint' : 'surface-2') + ');"></div></div>'
      + '<div class="between muted mono" style="font-size:10.5px;margin-top:5px;"><span>' + Catetin.fmtRp(paid) + (incoming ? ' received' : ' paid') + '</span><span>of ' + Catetin.fmtRp(d.amount) + '</span></div>';

    if (chip) html += '<div style="margin-top:10px;">' + chip + '</div>';

    if (payments.length) {
      html += '<hr class="divider" style="margin:12px 0 4px;"/>';
      payments.forEach(function (p) {
        html += '<div class="debt-pay-row"><div class="icon-chip" style="background:var(--surface-2);width:28px;height:28px;font-size:13px;">↓</div>'
          + '<div class="who"><div style="font-weight:600;">' + Catetin.fmtDateShort(p.paid_at) + (p.payment_source ? ' · ' + Catetin.escapeHtml(p.payment_source) : '') + '</div></div>'
          + '<span class="mono" style="font-weight:600;color:var(--mint-ink);">' + Catetin.fmtRp(p.amount) + '</span>'
          + '<button type="button" class="link" data-pay-del="' + p.id + '" style="color:var(--coral-ink);flex:none;">✕</button></div>';
      });
    }

    if (!isSettled) {
      html += '<button type="button" class="cta mint" data-debt-pay="' + d.id + '" style="margin-top:14px;">Record Payment</button>';
    }
    return html + '</div>';
  }).join('');

  Catetin.bindDebtDetailActions();
};

Catetin.bindDebtDetailActions = function () {
  var container = document.getElementById('debt-detail-list');

  container.querySelectorAll('[data-debt-pay]').forEach(function (btn) {
    btn.addEventListener('click', function () { Catetin.recordDebtPayment(btn.dataset.debtPay); });
  });

  container.querySelectorAll('[data-debt-del]').forEach(function (btn) {
    btn.addEventListener('click', function () { Catetin.deleteDebt(btn.dataset.debtDel); });
  });

  container.querySelectorAll('[data-pay-del]').forEach(function (btn) {
    btn.addEventListener('click', function () { Catetin.deleteDebtPayment(btn.dataset.payDel); });
  });
};

Catetin.recordDebtPayment = async function (debtId) {
  var debt = Catetin.state.debts.find(function (d) { return d.id === debtId; });
  if (!debt) return;

  var result = await Catetin.modal.recordPayment(debt, Catetin.debtRemaining(debt));
  if (!result) return;

  // The transaction goes in first: if it fails we can bail without leaving a
  // payment behind that claims a balance change which never happened.
  var txnId = null;
  if (result.recordTransaction && result.category && result.payment_source) {
    txnId = crypto.randomUUID();
    var txnRes = await Catetin.supabase.from('transactions').insert({
      id: txnId,
      user_id: Catetin.state.user.id,
      occurred_at: result.paid_at,
      type: result.txnType,
      amount: result.amount,
      category: result.category,
      payment_source: result.payment_source,
      note: (debt.direction === 'owed_to_me' ? 'Repayment from ' : 'Repaid to ') + debt.person_name,
      is_recurring: false,
      trip_id: null
    });
    if (txnRes.error) { Catetin.toast('Failed to record transaction'); return; }
  }

  var { error } = await Catetin.supabase.from('debt_payments').insert({
    user_id: Catetin.state.user.id,
    debt_id: debtId,
    amount: result.amount,
    paid_at: result.paid_at,
    payment_source: result.payment_source,
    transaction_id: txnId
  });
  if (error) {
    if (txnId) await Catetin.supabase.from('transactions').delete().eq('id', txnId);
    Catetin.toast('Failed to save payment');
    return;
  }

  await Catetin.reloadAll();
  Catetin.renderDebtDetail();
  Catetin.toast('Payment recorded');
};

Catetin.deleteDebtPayment = async function (paymentId) {
  var payment = Catetin.state.debtPayments.find(function (p) { return p.id === paymentId; });
  if (!payment) return;

  var ok = await Catetin.modal.confirm({
    title: 'Remove this payment?',
    message: payment.transaction_id ? 'The matching transaction will be removed too.' : '',
    danger: true,
    confirmLabel: 'Remove'
  });
  if (!ok) return;

  var { error } = await Catetin.supabase.from('debt_payments').delete().eq('id', paymentId);
  if (error) { Catetin.toast('Failed to remove'); return; }
  if (payment.transaction_id) await Catetin.supabase.from('transactions').delete().eq('id', payment.transaction_id);

  await Catetin.reloadAll();
  Catetin.renderDebtDetail();
  Catetin.toast('Payment removed');
};

Catetin.deleteDebt = async function (debtId) {
  var debt = Catetin.state.debts.find(function (d) { return d.id === debtId; });
  if (!debt) return;
  var payments = Catetin.debtPaymentsFor(debtId);
  var linked = payments.filter(function (p) { return p.transaction_id; });

  var ok = await Catetin.modal.confirm({
    title: 'Delete this debt?',
    message: linked.length
      ? 'Its ' + payments.length + ' payment' + (payments.length > 1 ? 's' : '') + ' and the ' + linked.length + ' matching transaction' + (linked.length > 1 ? 's' : '') + ' will be deleted too.'
      : '',
    danger: true,
    confirmLabel: 'Delete'
  });
  if (!ok) return;

  var { error } = await Catetin.supabase.from('debts').delete().eq('id', debtId);
  if (error) { Catetin.toast('Failed to delete'); return; }
  // debt_payments cascade in the database, but the transactions they created
  // don't - clear them here so no orphan income/expense is left behind.
  for (var i = 0; i < linked.length; i++) {
    await Catetin.supabase.from('transactions').delete().eq('id', linked[i].transaction_id);
  }

  await Catetin.reloadAll();
  Catetin.toast('Debt deleted');

  var stillThere = Catetin.debtPeople(Catetin.debts.direction).some(function (p) { return p.name === Catetin.currentDebtPerson; });
  if (stillThere) Catetin.renderDebtDetail();
  else Catetin.router.go('debts');
};
