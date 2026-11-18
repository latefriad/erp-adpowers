/**
 * ============================================================================
 * ADPOWRS DIGITAL ERP — FINANCE, BILLING, EXPENSES, SUPPLIERS & BENEFITS
 * ============================================================================
 */

const EXPENSE_CATEGORIES = [
  'SALAIRES', 'LOYER', 'ADS', 'ABONNEMENTS',
  'MATERIEL', 'IMPOTS', 'TRANSPORT', 'AUTRE'
];

function getExchangeRateForCurrency_(currency, settings) {
  const c = String(currency || 'DZD').toUpperCase();
  if (c === 'EUR') return toNum_(settings.eurRate || 245);
  if (c === 'USD') return toNum_(settings.usdRate || 225);
  return 1;
}

function enrichInvoice_(inv, paymentsByInvoice, clientMap) {
  const items = safeJsonParse_(inv.itemsJson, []);
  const pays = paymentsByInvoice[inv.id] || [];
  const approvedPays = pays.filter(function(p) { return p.status !== 'REJECTED'; });
  const paidAmount = round2_(approvedPays.reduce(function(s, p) { return s + toNum_(p.amount); }, 0));
  const paidDzd = round2_(approvedPays.reduce(function(s, p) { return s + toNum_(p.amountDzd); }, 0));
  const total = toNum_(inv.total);
  const totalDzd = toNum_(inv.totalDzd || total * toNum_(inv.exchangeRate || 1));
  const remaining = round2_(Math.max(0, total - paidAmount));
  const remainingDzd = round2_(Math.max(0, totalDzd - paidDzd));

  const today = new Date().toISOString().slice(0, 10);
  let computedStatus = inv.status || 'DRAFT';
  const isOverdue =
    inv.docType === 'FACTURE' &&
    computedStatus !== 'DRAFT' &&
    computedStatus !== 'ANNULEE' &&
    computedStatus !== 'PAYEE' &&
    remaining > 0 &&
    inv.dueDate &&
    String(inv.dueDate).slice(0, 10) < today;

  let daysOverdue = 0;
  if (isOverdue) {
    const dueMs = new Date(String(inv.dueDate).slice(0, 10) + 'T00:00:00Z').getTime();
    const todayMs = new Date(today + 'T00:00:00Z').getTime();
    daysOverdue = Math.max(0, Math.floor((todayMs - dueMs) / 86400000));
  }

  const client = clientMap ? clientMap[inv.clientId] : null;

  return Object.assign({}, inv, {
    items: items,
    payments: pays,
    paidAmount: paidAmount,
    paidDzd: paidDzd,
    remaining: remaining,
    remainingDzd: remainingDzd,
    isOverdue: isOverdue,
    daysOverdue: daysOverdue,
    displayStatus: isOverdue ? 'EN_RETARD' : computedStatus,
    clientName: client ? (client.company || client.name) : '',
    clientEmail: client ? client.email : '',
    clientPhone: client ? client.phone : ''
  });
}

function computeInvoiceTotals_(items, discount, exchangeRate) {
  let subtotal = 0;
  let taxTotal = 0;
  const normalized = (items || []).map(function(it) {
    const qty = toNum_(it.quantity || 1);
    const unitPrice = toNum_(it.unitPrice || 0);
    const taxRate = toNum_(it.taxRate !== undefined ? it.taxRate : 19);
    const lineNet = round2_(qty * unitPrice);
    const lineTax = round2_(lineNet * (taxRate / 100));
    subtotal += lineNet;
    taxTotal += lineTax;
    return {
      description: String(it.description || ''),
      quantity: qty,
      unitPrice: unitPrice,
      taxRate: taxRate,
      lineTotal: round2_(lineNet + lineTax)
    };
  });
  const disc = toNum_(discount || 0);
  subtotal = round2_(subtotal);
  taxTotal = round2_(taxTotal);
  const total = round2_(Math.max(0, subtotal - disc + taxTotal));
  const rate = toNum_(exchangeRate || 1) || 1;
  const totalDzd = round2_(total * rate);
  return {
    items: normalized,
    subtotal: subtotal,
    discount: disc,
    taxTotal: taxTotal,
    total: total,
    totalDzd: totalDzd
  };
}

/**
 * Atomically issues the next legal sequential number (FAC-2026-00001 / DEV-2026-00001)
 * using LockService so concurrent requests NEVER create duplicates or gaps.
 */
function nextLegalDocumentNumber_(docType, issueDateStr) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const year = issueDateStr ? String(issueDateStr).slice(0, 4) : String(new Date().getFullYear());
    const prefix = docType === 'DEVIS' ? 'DEV' : 'FAC';
    const key = 'counter_' + docType + '_' + year;
    const settings = getSettingsMap_();
    const nextNum = toNum_(settings[key] || 0) + 1;
    setSetting_(key, String(nextNum));
    const padded = ('00000' + nextNum).slice(-5);
    return prefix + '-' + year + '-' + padded;
  } finally {
    lock.releaseLock();
  }
}

/* =========================== INVOICES & QUOTES ============================ */

function handleListInvoices_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const invoices = dbGetAll_('Invoices');
  const payments = dbGetAll_('Payments');
  const clients = dbGetAll_('Clients');
  const recurring = dbGetAll_('Recurring');

  const clientMap = {};
  clients.forEach(function(c) { clientMap[c.id] = c; });

  const paysByInv = {};
  payments.forEach(function(p) {
    if (!paysByInv[p.invoiceId]) paysByInv[p.invoiceId] = [];
    paysByInv[p.invoiceId].push(p);
  });

  const enriched = invoices.map(function(inv) {
    return enrichInvoice_(inv, paysByInv, clientMap);
  }).sort(function(a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  return {
    invoices: enriched,
    recurring: recurring.map(function(r) {
      return Object.assign({}, r, {
        items: safeJsonParse_(r.itemsJson, []),
        active: r.active === true || String(r.active).toLowerCase() === 'true',
        clientName: clientMap[r.clientId] ? (clientMap[r.clientId].company || clientMap[r.clientId].name) : ''
      });
    })
  };
}

function handleSaveInvoice_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const settings = getSettingsMap_();
  const now = new Date().toISOString();
  const docType = payload.docType === 'DEVIS' ? 'DEVIS' : 'FACTURE';
  const currency = String(payload.currency || settings.defaultCurrency || 'DZD').toUpperCase();
  const exchangeRate = toNum_(payload.exchangeRate) || getExchangeRateForCurrency_(currency, settings);
  const calc = computeInvoiceTotals_(payload.items || [], payload.discount || 0, exchangeRate);

  const issueDate = payload.issueDate || now.slice(0, 10);
  const dueDate = payload.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

  if (payload.id) {
    const existing = dbGetById_('Invoices', payload.id);
    if (!existing) throw new Error('Invoice not found');
    const updated = dbUpdate_('Invoices', payload.id, {
      clientId: payload.clientId || existing.clientId,
      issueDate: issueDate,
      dueDate: dueDate,
      currency: currency,
      exchangeRate: exchangeRate,
      itemsJson: JSON.stringify(calc.items),
      subtotal: calc.subtotal,
      discount: calc.discount,
      taxTotal: calc.taxTotal,
      total: calc.total,
      totalDzd: calc.totalDzd,
      depositType: payload.depositType || existing.depositType || 'NONE',
      depositValue: toNum_(payload.depositValue),
      latePenaltyRate: toNum_(payload.latePenaltyRate),
      notes: payload.notes !== undefined ? String(payload.notes) : existing.notes,
      status: payload.status || existing.status,
      updatedAt: now
    });
    return { invoice: updated };
  }

  const finalizeNow = Boolean(payload.finalize);
  const number = finalizeNow ? nextLegalDocumentNumber_(docType, issueDate) : '';
  const status = finalizeNow ? 'EN_ATTENTE' : 'DRAFT';

  const record = {
    id: generateId_(docType === 'DEVIS' ? 'dev' : 'fac'),
    docType: docType,
    number: number,
    clientId: String(payload.clientId || ''),
    status: status,
    issueDate: issueDate,
    dueDate: dueDate,
    currency: currency,
    exchangeRate: exchangeRate,
    itemsJson: JSON.stringify(calc.items),
    subtotal: calc.subtotal,
    discount: calc.discount,
    taxTotal: calc.taxTotal,
    total: calc.total,
    totalDzd: calc.totalDzd,
    depositType: payload.depositType || 'NONE',
    depositValue: toNum_(payload.depositValue),
    latePenaltyRate: toNum_(payload.latePenaltyRate),
    notes: String(payload.notes || ''),
    convertedFromId: String(payload.convertedFromId || ''),
    publicToken: generateToken_(),
    sentAt: '',
    viewedAt: '',
    preReminderAt: '',
    lastReminderAt: '',
    createdAt: now,
    updatedAt: now
  };

  dbInsert_('Invoices', record);
  if (finalizeNow) {
    logActivity_('INVOICE', record.id, record.clientId, 'INVOICE_ISSUED', docType + ' ' + number + ' issued (' + calc.total + ' ' + currency + ')', user);
  }
  return { invoice: record };
}

function handleFinalizeInvoice_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const inv = dbGetById_('Invoices', payload.id);
  if (!inv) throw new Error('Invoice not found');
  if (inv.number) return { invoice: inv };

  const number = nextLegalDocumentNumber_(inv.docType, inv.issueDate);
  const updated = dbUpdate_('Invoices', inv.id, {
    number: number,
    status: 'EN_ATTENTE',
    updatedAt: new Date().toISOString()
  });
  logActivity_('INVOICE', inv.id, inv.clientId, 'INVOICE_ISSUED', inv.docType + ' ' + number + ' finalized', user);
  return { invoice: updated };
}

function handleConvertQuoteToInvoice_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const quote = dbGetById_('Invoices', payload.id);
  if (!quote) throw new Error('Quote not found');
  if (quote.docType !== 'DEVIS') throw new Error('Only quotes (DEVIS) can be converted');

  const items = safeJsonParse_(quote.itemsJson, []);
  return handleSaveInvoice_(user, {
    docType: 'FACTURE',
    clientId: quote.clientId,
    currency: quote.currency,
    exchangeRate: quote.exchangeRate,
    items: items,
    discount: quote.discount,
    depositType: quote.depositType,
    depositValue: quote.depositValue,
    latePenaltyRate: quote.latePenaltyRate,
    notes: quote.notes,
    convertedFromId: quote.id,
    finalize: true
  });
}

function handleDeleteInvoice_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const id = String(payload.id || '');
  if (!id) throw new Error('Invoice id required');

  // Cascade-delete any payments linked to this invoice so Treasury & Cash Received stay exact
  const payments = dbGetAll_('Payments', true);
  payments.forEach(function(p) {
    if (String(p.invoiceId) === id) {
      dbDelete_('Payments', p.id);
    }
  });

  const deleted = dbDelete_('Invoices', id);
  return { deleted: deleted };
}

function handleRecordPayment_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const inv = dbGetById_('Invoices', payload.invoiceId);
  if (!inv) throw new Error('Invoice not found');

  const amount = toNum_(payload.amount);
  if (amount <= 0) throw new Error('Payment amount must be greater than 0');

  const rate = toNum_(inv.exchangeRate || 1) || 1;
  const now = new Date().toISOString();
  const payment = {
    id: generateId_('pay'),
    invoiceId: inv.id,
    clientId: inv.clientId,
    amount: round2_(amount),
    currency: inv.currency || 'DZD',
    exchangeRate: rate,
    amountDzd: round2_(amount * rate),
    method: String(payload.method || 'VIREMENT'),
    paymentDate: payload.paymentDate || now.slice(0, 10),
    reference: String(payload.reference || ''),
    status: 'APPROVED',
    notes: String(payload.notes || ''),
    createdAt: now
  };
  dbInsert_('Payments', payment);

  // Recompute paid total -> auto-mark PAYEE
  const allPays = dbGetAll_('Payments', true).filter(function(p) {
    return p.invoiceId === inv.id && p.status !== 'REJECTED';
  });
  const totalPaid = round2_(allPays.reduce(function(s, p) { return s + toNum_(p.amount); }, 0));
  if (totalPaid >= toNum_(inv.total) - 0.01) {
    dbUpdate_('Invoices', inv.id, { status: 'PAYEE', updatedAt: now });
  } else if (inv.status === 'DRAFT') {
    const number = inv.number || nextLegalDocumentNumber_(inv.docType, inv.issueDate);
    dbUpdate_('Invoices', inv.id, { number: number, status: 'EN_ATTENTE', updatedAt: now });
  }

  logActivity_('INVOICE', inv.id, inv.clientId, 'INVOICE_PAID', 'Payment of ' + amount + ' ' + inv.currency + ' recorded on ' + (inv.number || inv.id), user);
  return { payment: payment, totalPaid: totalPaid };
}

function handleSendInvoiceEmail_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const inv = dbGetById_('Invoices', payload.id);
  if (!inv) throw new Error('Invoice not found');
  const client = dbGetById_('Clients', inv.clientId);
  const toEmail = payload.toEmail || (client ? client.email : '');
  if (!toEmail) throw new Error('Client has no email address');

  const settings = getSettingsMap_();
  const portalBase = settings.portalBaseUrl || payload.portalBaseUrl || '';
  const portalLink = portalBase && client && client.portalToken
    ? portalBase.replace(/\/$/, '') + '/portal/' + client.portalToken
    : '';

  const subject = payload.subject || (settings.agencyName + ' — ' + inv.docType + ' ' + (inv.number || 'Brouillon'));
  const body = payload.message || (
    'Bonjour ' + (client ? client.name : '') + ',\n\n' +
    'Veuillez trouver les détails de votre ' + (inv.docType === 'DEVIS' ? 'devis' : 'facture') + ' ' + (inv.number || '') +
    ' d\'un montant de ' + inv.total + ' ' + inv.currency + '.\n' +
    (inv.dueDate ? 'Date d\'échéance : ' + inv.dueDate + '\n' : '') +
    (portalLink ? '\nConsulter votre espace client : ' + portalLink + '\n' : '') +
    '\nCordialement,\n' + settings.agencyName
  );

  MailApp.sendEmail({
    to: toEmail,
    subject: subject,
    body: body,
    name: settings.agencyName || 'Adpowrs Digital'
  });

  const now = new Date().toISOString();
  const nextStatus = inv.status === 'EN_ATTENTE' || inv.status === 'DRAFT' ? 'SENT' : inv.status;
  dbUpdate_('Invoices', inv.id, { sentAt: now, status: nextStatus, updatedAt: now });
  logActivity_('INVOICE', inv.id, inv.clientId, 'INVOICE_SENT', 'Sent by email to ' + toEmail, user);
  return { sent: true, to: toEmail };
}

function handleSaveRecurring_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const now = new Date().toISOString();
  const settings = getSettingsMap_();
  const currency = String(payload.currency || 'DZD').toUpperCase();
  const record = {
    id: payload.id || generateId_('rec'),
    clientId: String(payload.clientId || ''),
    title: String(payload.title || 'Abonnement Mensuel'),
    frequency: String(payload.frequency || 'MONTHLY'),
    currency: currency,
    exchangeRate: toNum_(payload.exchangeRate) || getExchangeRateForCurrency_(currency, settings),
    itemsJson: JSON.stringify(payload.items || []),
    discount: toNum_(payload.discount || 0),
    notes: String(payload.notes || ''),
    nextRunAt: payload.nextRunAt || now.slice(0, 10),
    lastRunAt: payload.lastRunAt || '',
    active: payload.active !== undefined ? Boolean(payload.active) : true,
    createdAt: now,
    updatedAt: now
  };
  if (payload.id && dbGetById_('Recurring', payload.id)) {
    return { recurring: dbUpdate_('Recurring', payload.id, record) };
  }
  dbInsert_('Recurring', record);
  return { recurring: record };
}

/* =========================== EXPENSES & BUDGETS =========================== */

function handleListExpenses_(user) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  return {
    expenses: dbGetAll_('Expenses').sort(function(a, b) {
      return String(b.date).localeCompare(String(a.date));
    }),
    budgets: dbGetAll_('Budgets_Goals').map(function(b) {
      return Object.assign({}, b, {
        expenseBudgets: safeJsonParse_(b.expenseBudgetsJson, {})
      });
    }),
    categories: EXPENSE_CATEGORIES
  };
}

function handleSaveExpense_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const settings = getSettingsMap_();
  const now = new Date().toISOString();
  const currency = String(payload.currency || 'DZD').toUpperCase();
  const rate = toNum_(payload.exchangeRate) || getExchangeRateForCurrency_(currency, settings);
  const amount = round2_(toNum_(payload.amount));

  let receiptUrl = payload.receiptUrl || '';
  let receiptFileId = payload.receiptFileId || '';
  if (payload.receiptBase64 && payload.receiptFileName) {
    const uploaded = uploadReceiptToDrive_(payload.receiptBase64, payload.receiptFileName, payload.receiptMimeType);
    receiptUrl = uploaded.url;
    receiptFileId = uploaded.fileId;
  }

  const data = {
    date: payload.date || now.slice(0, 10),
    category: EXPENSE_CATEGORIES.indexOf(payload.category) !== -1 ? payload.category : 'AUTRE',
    description: String(payload.description || ''),
    amount: amount,
    currency: currency,
    exchangeRate: rate,
    amountDzd: round2_(amount * rate),
    supplierBillId: String(payload.supplierBillId || ''),
    receiptUrl: receiptUrl,
    receiptFileId: receiptFileId,
    notes: String(payload.notes || ''),
    updatedAt: now
  };

  if (payload.id) {
    return { expense: dbUpdate_('Expenses', payload.id, data) };
  }

  const record = Object.assign({
    id: generateId_('exp'),
    createdBy: user.id,
    createdAt: now
  }, data);
  dbInsert_('Expenses', record);
  return { expense: record };
}

function handleSaveBudgetGoal_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const year = String(payload.year || new Date().getFullYear());
  const month = String(payload.month || (new Date().getMonth() + 1)).padStart(2, '0');
  const id = year + '-' + month;
  const now = new Date().toISOString();
  const existing = dbGetById_('Budgets_Goals', id);

  const patch = {
    id: id,
    year: Number(year),
    month: Number(month),
    revenueTarget: payload.revenueTarget !== undefined
      ? toNum_(payload.revenueTarget)
      : (existing ? toNum_(existing.revenueTarget) : 0),
    expenseBudgetsJson: payload.expenseBudgets !== undefined
      ? JSON.stringify(payload.expenseBudgets)
      : (existing ? existing.expenseBudgetsJson : '{}'),
    updatedAt: now
  };

  if (existing) {
    return { budget: dbUpdate_('Budgets_Goals', id, patch) };
  }
  dbInsert_('Budgets_Goals', patch);
  return { budget: patch };
}

/* =========================== SUPPLIERS & PAYABLES ========================= */

function handleListSuppliers_(user) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const suppliers = dbGetAll_('Suppliers');
  const bills = dbGetAll_('SupplierBills');
  const supMap = {};
  suppliers.forEach(function(s) { supMap[s.id] = s; });

  return {
    suppliers: suppliers,
    bills: bills.map(function(b) {
      return Object.assign({}, b, {
        supplierName: supMap[b.supplierId] ? supMap[b.supplierId].name : ''
      });
    }).sort(function(a, b) { return String(b.dueDate).localeCompare(String(a.dueDate)); })
  };
}

function handleSaveSupplier_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const now = new Date().toISOString();
  if (payload.id) {
    return {
      supplier: dbUpdate_('Suppliers', payload.id, {
        name: String(payload.name || ''),
        category: String(payload.category || 'AUTRE'),
        email: String(payload.email || ''),
        phone: String(payload.phone || ''),
        notes: String(payload.notes || ''),
        updatedAt: now
      })
    };
  }
  const record = {
    id: generateId_('sup'),
    name: String(payload.name || ''),
    category: String(payload.category || 'AUTRE'),
    email: String(payload.email || ''),
    phone: String(payload.phone || ''),
    notes: String(payload.notes || ''),
    createdAt: now,
    updatedAt: now
  };
  dbInsert_('Suppliers', record);
  return { supplier: record };
}

function handleSaveSupplierBill_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const settings = getSettingsMap_();
  const now = new Date().toISOString();
  const currency = String(payload.currency || 'DZD').toUpperCase();
  const rate = toNum_(payload.exchangeRate) || getExchangeRateForCurrency_(currency, settings);
  const amount = round2_(toNum_(payload.amount));

  const data = {
    supplierId: String(payload.supplierId || ''),
    description: String(payload.description || ''),
    category: EXPENSE_CATEGORIES.indexOf(payload.category) !== -1 ? payload.category : 'AUTRE',
    amount: amount,
    currency: currency,
    exchangeRate: rate,
    amountDzd: round2_(amount * rate),
    dueDate: payload.dueDate || now.slice(0, 10),
    status: payload.status || 'A_PAYER',
    notes: String(payload.notes || ''),
    updatedAt: now
  };
  if (payload.id) {
    return { bill: dbUpdate_('SupplierBills', payload.id, data) };
  }
  const record = Object.assign({
    id: generateId_('bill'),
    paidAt: '',
    expenseId: '',
    createdAt: now
  }, data);
  dbInsert_('SupplierBills', record);
  return { bill: record };
}

/**
 * Atomic single source of truth: Paying a SupplierBill marks it PAYEE
 * AND creates the linked Expense row in one locked transaction.
 */
function handlePaySupplierBill_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const bill = dbGetById_('SupplierBills', payload.id);
    if (!bill) throw new Error('Supplier bill not found');
    if (bill.status === 'PAYEE') throw new Error('Bill is already paid');

    const supplier = dbGetById_('Suppliers', bill.supplierId);
    const now = new Date().toISOString();
    const payDate = payload.date || now.slice(0, 10);

    const exp = {
      id: generateId_('exp'),
      date: payDate,
      category: bill.category || 'AUTRE',
      description: '[Fournisseur: ' + (supplier ? supplier.name : '') + '] ' + bill.description,
      amount: toNum_(bill.amount),
      currency: bill.currency || 'DZD',
      exchangeRate: toNum_(bill.exchangeRate || 1),
      amountDzd: toNum_(bill.amountDzd),
      supplierBillId: bill.id,
      receiptUrl: '',
      receiptFileId: '',
      notes: bill.notes || '',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    };
    dbInsert_('Expenses', exp);

    const updatedBill = dbUpdate_('SupplierBills', bill.id, {
      status: 'PAYEE',
      paidAt: payDate,
      expenseId: exp.id,
      updatedAt: now
    });

    return { bill: updatedBill, expense: exp };
  } finally {
    lock.releaseLock();
  }
}

/* =========================== MES BÉNÉFICES (ADMIN) ======================== */

function handleGetBenefits_(user, payload) {
  requireRole_(user, ['ADMIN']);
  const settings = getSettingsMap_();
  const opening = toNum_(settings.openingTreasuryBalance || 0);
  const payments = dbGetAll_('Payments').filter(function(p) { return p.status !== 'REJECTED'; });
  const expenses = dbGetAll_('Expenses');
  const personal = dbGetAll_('Benefits');
  const invoices = dbGetAll_('Invoices');
  const clients = dbGetAll_('Clients');

  const invMap = {};
  invoices.forEach(function(i) { invMap[i.id] = i; });
  const clientMap = {};
  clients.forEach(function(c) { clientMap[c.id] = c; });

  const merged = [];
  payments.forEach(function(p) {
    const inv = invMap[p.invoiceId];
    const cl = clientMap[p.clientId];
    merged.push({
      id: 'pay_' + p.id,
      source: 'INVOICE_PAYMENT',
      readOnly: true,
      date: String(p.paymentDate || p.createdAt).slice(0, 10),
      type: 'REVENUE',
      category: 'CLIENT_PAYMENT',
      description: (inv && inv.number ? inv.number + ' — ' : '') + (cl ? (cl.company || cl.name) : 'Client'),
      amountDzd: toNum_(p.amountDzd),
      notes: p.notes || ''
    });
  });

  expenses.forEach(function(e) {
    merged.push({
      id: 'exp_' + e.id,
      source: 'AGENCY_EXPENSE',
      readOnly: true,
      date: String(e.date || e.createdAt).slice(0, 10),
      type: 'EXPENSE',
      category: e.category || 'AUTRE',
      description: e.description,
      amountDzd: toNum_(e.amountDzd),
      notes: e.notes || ''
    });
  });

  personal.forEach(function(b) {
    merged.push({
      id: b.id,
      source: 'MANUAL',
      readOnly: false,
      date: String(b.date || b.createdAt).slice(0, 10),
      type: b.type || 'WITHDRAWAL',
      category: b.category || 'PERSONAL',
      description: b.description,
      amountDzd: toNum_(b.amountDzd),
      notes: b.notes || ''
    });
  });

  merged.sort(function(a, b) { return b.date.localeCompare(a.date); });

  // All-time available balance
  let allRev = 0, allExp = 0, allWith = 0;
  merged.forEach(function(t) {
    if (t.type === 'REVENUE') allRev += t.amountDzd;
    else if (t.type === 'EXPENSE') allExp += t.amountDzd;
    else if (t.type === 'WITHDRAWAL') allWith += t.amountDzd;
  });
  const availableBalance = round2_(opening + allRev - allExp - allWith);

  // Filter period
  const startDate = payload.startDate || '';
  const endDate = payload.endDate || '';
  const filtered = merged.filter(function(t) {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  let periodRev = 0, periodExp = 0, periodWith = 0;
  const catTotals = {};
  filtered.forEach(function(t) {
    if (t.type === 'REVENUE') periodRev += t.amountDzd;
    else if (t.type === 'EXPENSE') {
      periodExp += t.amountDzd;
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amountDzd;
    } else if (t.type === 'WITHDRAWAL') {
      periodWith += t.amountDzd;
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amountDzd;
    }
  });

  // 6-month multi-bar series
  const months = lastNMonths_(6);
  const monthlySeries = months.map(function(m) {
    let r = 0, e = 0, w = 0;
    merged.forEach(function(t) {
      if (t.date.slice(0, 7) === m) {
        if (t.type === 'REVENUE') r += t.amountDzd;
        else if (t.type === 'EXPENSE') e += t.amountDzd;
        else if (t.type === 'WITHDRAWAL') w += t.amountDzd;
      }
    });
    return { month: m, revenue: round2_(r), expense: round2_(e), withdrawal: round2_(w) };
  });

  return {
    availableBalance: availableBalance,
    openingBalance: opening,
    period: {
      revenue: round2_(periodRev),
      expense: round2_(periodExp),
      withdrawal: round2_(periodWith),
      netProfit: round2_(periodRev - periodExp)
    },
    monthlySeries: monthlySeries,
    categoryBreakdown: Object.keys(catTotals).map(function(k) {
      return { category: k, total: round2_(catTotals[k]) };
    }).sort(function(a, b) { return b.total - a.total; }),
    transactions: filtered
  };
}

function handleSaveBenefitTx_(user, payload) {
  requireRole_(user, ['ADMIN']);
  const now = new Date().toISOString();
  const data = {
    date: payload.date || now.slice(0, 10),
    type: String(payload.type || 'WITHDRAWAL'),
    category: String(payload.category || 'PERSONAL'),
    description: String(payload.description || ''),
    amountDzd: round2_(toNum_(payload.amountDzd)),
    notes: String(payload.notes || ''),
    updatedAt: now
  };
  if (payload.id) {
    return { transaction: dbUpdate_('Benefits', payload.id, data) };
  }
  const rec = Object.assign({ id: generateId_('ben'), createdAt: now }, data);
  dbInsert_('Benefits', rec);
  return { transaction: rec };
}

/* =========================== MAIN FINANCIAL DASHBOARD ===================== */

function lastNMonths_(n) {
  const out = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const y = dt.getFullYear();
    const m = ('0' + (dt.getMonth() + 1)).slice(-2);
    out.push(y + '-' + m);
  }
  return out;
}

function handleGetDashboard_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const settings = getSettingsMap_();
  const opening = toNum_(settings.openingTreasuryBalance || 0);

  const invoicesRaw = dbGetAll_('Invoices');
  const payments = dbGetAll_('Payments').filter(function(p) { return p.status !== 'REJECTED'; });
  const expenses = dbGetAll_('Expenses');
  const bills = dbGetAll_('SupplierBills');
  const clients = dbGetAll_('Clients');
  const recurring = dbGetAll_('Recurring');
  const budgets = dbGetAll_('Budgets_Goals');

  const clientMap = {};
  clients.forEach(function(c) { clientMap[c.id] = c; });

  const paysByInv = {};
  payments.forEach(function(p) {
    if (!paysByInv[p.invoiceId]) paysByInv[p.invoiceId] = [];
    paysByInv[p.invoiceId].push(p);
  });

  const invoices = invoicesRaw.map(function(i) { return enrichInvoice_(i, paysByInv, clientMap); });

  // Period bounds (default current month, timezone-safe YYYY-MM-DD)
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  const mm = ('0' + m).slice(-2);
  const defaultStart = y + '-' + mm + '-01';
  const defaultEnd = y + '-' + mm + '-' + ('0' + lastDay).slice(-2);
  const startDate = payload.startDate || defaultStart;
  const endDate = payload.endDate || defaultEnd;

  // 1. Real-Time Treasury (all-time)
  const allCashIn = payments.reduce(function(s, p) { return s + toNum_(p.amountDzd); }, 0);
  const allExpenses = expenses.reduce(function(s, e) { return s + toNum_(e.amountDzd); }, 0);
  const treasuryBalance = round2_(opening + allCashIn - allExpenses);

  // 2. Period KPIs
  const periodPayments = payments.filter(function(p) {
    const d = String(p.paymentDate || p.createdAt).slice(0, 10);
    return d >= startDate && d <= endDate;
  });
  const periodExpenses = expenses.filter(function(e) {
    const d = String(e.date || e.createdAt).slice(0, 10);
    return d >= startDate && d <= endDate;
  });
  const periodBilledInvoices = invoices.filter(function(i) {
    const d = String(i.issueDate || i.createdAt).slice(0, 10);
    return i.docType === 'FACTURE' && i.status !== 'DRAFT' && i.status !== 'ANNULEE' && d >= startDate && d <= endDate;
  });

  const cashReceived = round2_(periodPayments.reduce(function(s, p) { return s + toNum_(p.amountDzd); }, 0));
  const totalExpenses = round2_(periodExpenses.reduce(function(s, e) { return s + toNum_(e.amountDzd); }, 0));
  const netProfit = round2_(cashReceived - totalExpenses);
  const profitMargin = cashReceived > 0 ? round2_((netProfit / cashReceived) * 100) : 0;
  const totalBilled = round2_(periodBilledInvoices.reduce(function(s, i) { return s + toNum_(i.totalDzd); }, 0));
  const collectionRate = totalBilled > 0 ? round2_(Math.min(100, (cashReceived / totalBilled) * 100)) : 0;

  // Open & overdue receivables (all active invoices)
  let outstandingReceivables = 0;
  let overdueReceivables = 0;
  let overdueCount = 0;
  const aging = { notDue: 0, d1_30: 0, d31_60: 0, d60Plus: 0 };
  const overdueList = [];

  invoices.forEach(function(inv) {
    if (inv.docType !== 'FACTURE' || inv.status === 'DRAFT' || inv.status === 'ANNULEE' || inv.remainingDzd <= 0) return;
    outstandingReceivables += inv.remainingDzd;
    if (inv.isOverdue) {
      overdueReceivables += inv.remainingDzd;
      overdueCount++;
      overdueList.push({
        id: inv.id,
        number: inv.number || inv.id,
        clientName: inv.clientName,
        clientPhone: inv.clientPhone,
        remainingDzd: inv.remainingDzd,
        dueDate: inv.dueDate,
        daysOverdue: inv.daysOverdue
      });
      if (inv.daysOverdue <= 30) aging.d1_30 += inv.remainingDzd;
      else if (inv.daysOverdue <= 60) aging.d31_60 += inv.remainingDzd;
      else aging.d60Plus += inv.remainingDzd;
    } else {
      aging.notDue += inv.remainingDzd;
    }
  });
  overdueList.sort(function(a, b) { return b.remainingDzd - a.remainingDzd; });

  // Supplier payables
  const todayStr = now.toISOString().slice(0, 10);
  let supplierPayables = 0;
  let overduePayables = 0;
  bills.forEach(function(b) {
    if (b.status === 'A_PAYER') {
      supplierPayables += toNum_(b.amountDzd);
      if (b.dueDate && String(b.dueDate).slice(0, 10) < todayStr) {
        overduePayables += toNum_(b.amountDzd);
      }
    }
  });

  // DSO (Days Sales Outstanding)
  const periodDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1);
  const dso = totalBilled > 0 ? Math.round((outstandingReceivables / totalBilled) * periodDays) : 0;

  // Monthly cash curve (last 6 months)
  const months6 = lastNMonths_(6);
  const monthlyCashCurve = months6.map(function(m) {
    const rev = payments.filter(function(p) { return String(p.paymentDate || p.createdAt).slice(0, 7) === m; })
      .reduce(function(s, p) { return s + toNum_(p.amountDzd); }, 0);
    const exp = expenses.filter(function(e) { return String(e.date || e.createdAt).slice(0, 7) === m; })
      .reduce(function(s, e) { return s + toNum_(e.amountDzd); }, 0);
    return { month: m, cashIn: round2_(rev), expenses: round2_(exp), profit: round2_(rev - exp) };
  });

  // Invoice status breakdown
  const statusCounts = { DRAFT: 0, SENT: 0, EN_ATTENTE: 0, EN_RETARD: 0, PAYEE: 0, ANNULEE: 0 };
  invoices.filter(function(i) { return i.docType === 'FACTURE'; }).forEach(function(i) {
    const st = i.displayStatus || i.status;
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });

  // Expenses by category
  const expByCat = {};
  periodExpenses.forEach(function(e) {
    const c = e.category || 'AUTRE';
    expByCat[c] = (expByCat[c] || 0) + toNum_(e.amountDzd);
  });
  const expensesByCategory = EXPENSE_CATEGORIES.map(function(c) {
    const val = round2_(expByCat[c] || 0);
    return { category: c, total: val, pct: totalExpenses > 0 ? round2_((val / totalExpenses) * 100) : 0 };
  }).filter(function(x) { return x.total > 0; }).sort(function(a, b) { return b.total - a.total; });

  // Top Clients by cash received + profitability
  const clientStats = {};
  clients.forEach(function(c) {
    clientStats[c.id] = { id: c.id, name: c.company || c.name, received: 0, outstanding: 0 };
  });
  payments.forEach(function(p) {
    if (clientStats[p.clientId]) clientStats[p.clientId].received += toNum_(p.amountDzd);
  });
  invoices.forEach(function(i) {
    if (i.docType === 'FACTURE' && i.status !== 'DRAFT' && i.status !== 'ANNULEE' && clientStats[i.clientId]) {
      clientStats[i.clientId].outstanding += i.remainingDzd;
    }
  });
  const topClients = Object.keys(clientStats).map(function(id) {
    const s = clientStats[id];
    return { id: s.id, name: s.name, received: round2_(s.received), outstanding: round2_(s.outstanding) };
  }).filter(function(c) { return c.received > 0 || c.outstanding > 0; })
    .sort(function(a, b) { return b.received - a.received; })
    .slice(0, 6);

  // MRR from active recurring schedules
  let mrr = 0;
  let activeSubscriptions = 0;
  recurring.forEach(function(r) {
    const isAct = r.active === true || String(r.active).toLowerCase() === 'true';
    if (!isAct) return;
    activeSubscriptions++;
    const items = safeJsonParse_(r.itemsJson, []);
    const calc = computeInvoiceTotals_(items, r.discount || 0, r.exchangeRate || 1);
    if (r.frequency === 'QUARTERLY') mrr += calc.totalDzd / 3;
    else if (r.frequency === 'YEARLY') mrr += calc.totalDzd / 12;
    else mrr += calc.totalDzd;
  });

  // Current month Budget vs Actuals
  const curYM = now.toISOString().slice(0, 7);
  const curBudgetRow = budgets.find(function(b) { return b.id === curYM; });
  const curMonthRev = payments.filter(function(p) { return String(p.paymentDate || p.createdAt).slice(0, 7) === curYM; })
    .reduce(function(s, p) { return s + toNum_(p.amountDzd); }, 0);
  const curMonthExpByCat = {};
  expenses.filter(function(e) { return String(e.date || e.createdAt).slice(0, 7) === curYM; })
    .forEach(function(e) { curMonthExpByCat[e.category] = (curMonthExpByCat[e.category] || 0) + toNum_(e.amountDzd); });

  const revenueGoal = curBudgetRow ? toNum_(curBudgetRow.revenueTarget) : 0;
  const catCeilings = curBudgetRow ? safeJsonParse_(curBudgetRow.expenseBudgetsJson, {}) : {};
  const budgetVsActuals = {
    month: curYM,
    revenueTarget: revenueGoal,
    revenueActual: round2_(curMonthRev),
    categories: Object.keys(catCeilings).map(function(c) {
      const target = toNum_(catCeilings[c]);
      const actual = round2_(curMonthExpByCat[c] || 0);
      return { category: c, budget: target, actual: actual, over: target > 0 && actual > target };
    }).filter(function(x) { return x.budget > 0 || x.actual > 0; })
  };

  // 3-Month Cashflow Forecast
  const avgMonthlyExp = monthlyCashCurve.reduce(function(s, m) { return s + m.expenses; }, 0) / Math.max(1, monthlyCashCurve.length);
  let runningBalance = treasuryBalance;
  const forecast = [1, 2, 3].map(function(offset) {
    const dt = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const ym = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2);
    const dueIn = invoices.filter(function(i) {
      return i.docType === 'FACTURE' && i.remainingDzd > 0 && String(i.dueDate || '').slice(0, 7) === ym;
    }).reduce(function(s, i) { return s + i.remainingDzd; }, 0);
    const expectedIn = round2_(dueIn + mrr);
    const billsOut = bills.filter(function(b) {
      return b.status === 'A_PAYER' && String(b.dueDate || '').slice(0, 7) === ym;
    }).reduce(function(s, b) { return s + toNum_(b.amountDzd); }, 0);
    const expectedOut = round2_(Math.max(billsOut, avgMonthlyExp));
    runningBalance = round2_(runningBalance + expectedIn - expectedOut);
    return { month: ym, expectedIn: expectedIn, expectedOut: expectedOut, projectedBalance: runningBalance };
  });

  return {
    treasuryBalance: treasuryBalance,
    openingBalance: opening,
    kpis: {
      cashReceived: cashReceived,
      totalExpenses: totalExpenses,
      expenseCount: periodExpenses.length,
      netProfit: netProfit,
      profitMargin: profitMargin,
      totalBilled: totalBilled,
      collectionRate: collectionRate,
      outstandingReceivables: round2_(outstandingReceivables),
      overdueReceivables: round2_(overdueReceivables),
      overdueCount: overdueCount,
      supplierPayables: round2_(supplierPayables),
      overduePayables: round2_(overduePayables),
      dso: dso,
      mrr: round2_(mrr),
      activeSubscriptions: activeSubscriptions
    },
    aging: {
      notDue: round2_(aging.notDue),
      d1_30: round2_(aging.d1_30),
      d31_60: round2_(aging.d31_60),
      d60Plus: round2_(aging.d60Plus)
    },
    overdueList: overdueList.slice(0, 8),
    monthlyCashCurve: monthlyCashCurve,
    invoiceStatusBreakdown: statusCounts,
    expensesByCategory: expensesByCategory,
    topClients: topClients,
    budgetVsActuals: budgetVsActuals,
    forecast: forecast,
    recentInvoices: invoices.slice(0, 6)
  };
}
