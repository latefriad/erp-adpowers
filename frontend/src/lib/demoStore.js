/**
 * Clean Local Store matching the Google Apps Script API contract.
 * Starts at 0 across all financial & operational tables so calculations are 100% transparent.
 * Activates automatically only when no Google Apps Script URL is connected yet.
 */

const STORAGE_KEY = 'adpowrs_demo_db_v2';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seedCleanZeroData() {
  const today = localToday();
  return {
    settings: {
      agencyName: 'Adpowrs Digital',
      tagline: 'Performance Marketing & E-Commerce Growth',
      email: 'contact@adpowrs.com',
      phone: '+213 550 00 00 00',
      address: 'Alger, Algérie',
      website: 'https://adpowrs.com',
      taxId: '',
      rcNumber: '',
      nisNumber: '',
      bankAccount: '',
      logoUrl: '',
      primaryColor: '#6366f1',
      secondaryColor: '#0ea5e9',
      defaultCurrency: 'DZD',
      defaultTaxRate: 19,
      eurRate: 245,
      usdRate: 225,
      openingTreasuryBalance: 0,
      remindersEnabled: false,
      reminderLeadDays: 3,
      reminderIntervalDays: 5,
      portalBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
      lastBackupAt: ''
    },
    users: [
      { id: 'usr_admin', name: 'Admin Adpowrs', email: 'admin@adpowrs.com', role: 'ADMIN', phone: '+213550000000', active: true, createdAt: today },
      { id: 'usr_acc', name: 'Comptable', email: 'compta@adpowrs.com', role: 'ACCOUNTANT', phone: '', active: true, createdAt: today },
      { id: 'usr_mb', name: 'Media Buyer', email: 'ads@adpowrs.com', role: 'MEDIA_BUYER', phone: '', active: true, createdAt: today },
      { id: 'usr_team', name: 'Équipe', email: 'team@adpowrs.com', role: 'TEAM', phone: '', active: true, createdAt: today }
    ],
    clients: [],
    leads: [],
    services: [
      { id: 'srv_1', name: 'Gestion Meta Ads (Mensuel)', category: 'ADS', description: 'Media buying + reporting + optimisation', basePrice: 20000, salePrice: 60000, charges: [{ label: 'Créas & Setup', amount: 15000 }], totalCharges: 15000, netProfit: 45000, currency: 'DZD' },
      { id: 'srv_2', name: 'Pack Testili (5 Produits)', category: 'TESTILI', description: 'Recherche + Landing + Tests Ads', basePrice: 15000, salePrice: 45000, charges: [{ label: 'Montage Vidéo', amount: 10000 }], totalCharges: 10000, netProfit: 35000, currency: 'DZD' },
      { id: 'srv_3', name: 'Landing Page COD Conversion', category: 'WEBSITE', description: 'Design + Dev + Pixel + CAPI', basePrice: 25000, salePrice: 95000, charges: [{ label: 'Domaine & Hosting', amount: 8000 }], totalCharges: 8000, netProfit: 87000, currency: 'DZD' }
    ],
    invoices: [],
    payments: [],
    recurring: [],
    expenses: [],
    budgets: [],
    suppliers: [],
    supplierBills: [],
    benefits: [],
    adSpend: [],
    testili: [],
    tasks: [],
    templates: [
      {
        id: 'tpl_1', name: 'Onboarding Meta Ads E-Commerce', serviceType: 'META_ADS',
        description: 'Workflow complet de lancement Meta Ads',
        tasks: [
          { title: 'Audit Business Manager, Pixel & CAPI', priority: 'HIGH', dayOffset: 1, defaultRole: 'MEDIA_BUYER' },
          { title: 'Brief créatif & scripts UGC / Hooks', priority: 'HIGH', dayOffset: 2, defaultRole: 'TEAM' },
          { title: 'Montage 5 créatives vidéos', priority: 'MEDIUM', dayOffset: 4, defaultRole: 'TEAM' },
          { title: 'Lancement campagne Testing ABO', priority: 'HIGH', dayOffset: 5, defaultRole: 'MEDIA_BUYER' }
        ]
      },
      {
        id: 'tpl_2', name: 'Sprint Testili (Validation Produit)', serviceType: 'TESTILI',
        description: 'Validation rapide de produits gagnants',
        tasks: [
          { title: 'Sélection 3 produits + offre COD', priority: 'HIGH', dayOffset: 1, defaultRole: 'MEDIA_BUYER' },
          { title: 'Création Landing Pages COD', priority: 'HIGH', dayOffset: 2, defaultRole: 'TEAM' },
          { title: 'Lancement tests & verdict Winner/Loser', priority: 'HIGH', dayOffset: 5, defaultRole: 'MEDIA_BUYER' }
        ]
      }
    ],
    activityLog: [],
    backups: [],
    counters: { FACTURE: 0, DEVIS: 0 }
  };
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const seeded = seedCleanZeroData();
  saveDb(seeded);
  return seeded;
}

function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {}
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function enrichInv(inv, db) {
  const pays = db.payments.filter((p) => p.invoiceId === inv.id && p.status !== 'REJECTED');
  const paidAmount = round2(pays.reduce((s, p) => s + Number(p.amount || 0), 0));
  const paidDzd = round2(pays.reduce((s, p) => s + Number(p.amountDzd || 0), 0));
  const total = round2(inv.total || 0);
  const totalDzd = round2(inv.totalDzd ?? total * Number(inv.exchangeRate || 1));
  const remaining = round2(Math.max(0, total - paidAmount));
  const remainingDzd = round2(Math.max(0, totalDzd - paidDzd));
  const today = localToday();
  const isOverdue =
    inv.docType === 'FACTURE' &&
    !['DRAFT', 'ANNULEE', 'PAYEE'].includes(inv.status) &&
    remaining > 0 &&
    inv.dueDate &&
    inv.dueDate < today;
  const daysOverdue = isOverdue ? Math.max(0, Math.floor((new Date(today) - new Date(inv.dueDate)) / 86400000)) : 0;
  const client = db.clients.find((c) => c.id === inv.clientId);
  return {
    ...inv,
    payments: pays,
    paidAmount,
    paidDzd,
    remaining,
    remainingDzd,
    isOverdue,
    daysOverdue,
    displayStatus: isOverdue ? 'EN_RETARD' : inv.status,
    clientName: client ? (client.company || client.name) : (inv.clientName || 'Client'),
    clientEmail: client?.email || '',
    clientPhone: client?.phone || ''
  };
}

function computeTotals(items = [], discount = 0, rate = 1) {
  let subtotal = 0;
  const lines = (items || []).map((it) => {
    const qty = Number(it.quantity || 1);
    const up = Number(it.unitPrice || 0);
    const tr = Number(it.taxRate !== undefined && it.taxRate !== '' ? it.taxRate : 19);
    const net = round2(qty * up);
    subtotal += net;
    return {
      description: String(it.description || ''),
      quantity: qty,
      unitPrice: up,
      taxRate: tr,
      lineNet: net
    };
  });

  subtotal = round2(subtotal);
  const disc = round2(Number(discount || 0));
  const netCommercial = Math.max(0, round2(subtotal - disc));
  const discountRatio = subtotal > 0 ? (netCommercial / subtotal) : 1;

  let taxTotal = 0;
  const norm = lines.map((l) => {
    const lineTax = round2(l.lineNet * discountRatio * (l.taxRate / 100));
    taxTotal += lineTax;
    return {
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
      lineTotal: round2(l.lineNet + lineTax)
    };
  });

  taxTotal = round2(taxTotal);
  const total = round2(netCommercial + taxTotal);
  const fx = Number(rate || 1) || 1;
  const totalDzd = round2(total * fx);

  return {
    items: norm,
    subtotal,
    discount: disc,
    taxTotal,
    total,
    totalDzd
  };
}

export async function runDemoAction(action, payload = {}, currentUser = null) {
  const db = loadDb();
  const user = currentUser || db.users[0];
  const now = new Date().toISOString();
  const today = localToday();

  switch (action) {
    case 'resetAllData': {
      const fresh = seedCleanZeroData();
      saveDb(fresh);
      return { reset: true };
    }
    case 'login': {
      const email = String(payload.email || '').trim().toLowerCase();
      const found = db.users.find((u) => u.email.toLowerCase() === email) || db.users[0];
      return { token: `demo_${found.id}`, user: found, settings: db.settings };
    }
    case 'me':
      return { user, settings: db.settings };
    case 'logout':
      return { loggedOut: true };
    case 'changePassword':
      return { updated: true };

    case 'getSettings':
      return { settings: db.settings };
    case 'updateSettings':
      db.settings = { ...db.settings, ...payload };
      saveDb(db);
      return { settings: db.settings };
    case 'uploadLogo':
      db.settings.logoUrl = payload.base64;
      saveDb(db);
      return { logoUrl: payload.base64 };

    case 'listUsers':
      return { users: db.users };
    case 'createUser': {
      const u = { id: uid('usr'), name: payload.name, email: payload.email, role: payload.role || 'TEAM', phone: payload.phone || '', active: true, createdAt: today };
      db.users.push(u);
      saveDb(db);
      return { user: u };
    }
    case 'updateUser': {
      const idx = db.users.findIndex((u) => u.id === (payload.id || user.id));
      if (idx !== -1) db.users[idx] = { ...db.users[idx], ...payload };
      saveDb(db);
      return { user: db.users[idx] };
    }

    case 'getDashboard': {
      const opening = Number(db.settings.openingTreasuryBalance || 0);
      const invoices = db.invoices.map((i) => enrichInv(i, db));
      const validInvoices = invoices.filter((i) => i.docType === 'FACTURE' && !['DRAFT', 'ANNULEE'].includes(i.status));
      const allInvoicedTotal = round2(validInvoices.reduce((s, i) => s + Number(i.totalDzd || 0), 0));

      const approvedPayments = db.payments.filter((p) => p.status !== 'REJECTED');
      const allPaymentsTotal = round2(approvedPayments.reduce((s, p) => s + Number(p.amountDzd || 0), 0));
      const paidInvoicesTotal = round2(validInvoices.reduce((s, i) => s + Number(i.paidDzd || (i.status === 'PAYEE' ? i.totalDzd : 0)), 0));

      // Calculate effective cash/invoiced revenue: if separate payments logged use them, otherwise use invoices total
      const effectiveCashIn = allPaymentsTotal > 0 ? allPaymentsTotal : (paidInvoicesTotal > 0 ? paidInvoicesTotal : allInvoicedTotal);
      const allOut = round2(db.expenses.reduce((s, e) => s + Number(e.amountDzd || 0), 0));
      const treasuryBalance = round2(opening + effectiveCashIn - allOut);

      const start = payload.startDate || `${today.slice(0, 7)}-01`;
      const end = payload.endDate || `${today.slice(0, 7)}-31`;
      const pPays = approvedPayments.filter((p) => p.paymentDate >= start && p.paymentDate <= end);
      const pExps = db.expenses.filter((e) => e.date >= start && e.date <= end);
      const pInvs = invoices.filter((i) => i.docType === 'FACTURE' && !['DRAFT', 'ANNULEE'].includes(i.status) && i.issueDate >= start && i.issueDate <= end);

      const periodInvoiced = round2(pInvs.reduce((s, i) => s + Number(i.totalDzd || 0), 0));
      const periodPayments = round2(pPays.reduce((s, p) => s + Number(p.amountDzd || 0), 0));
      const cashReceived = periodPayments > 0 ? periodPayments : periodInvoiced;
      const totalExpenses = round2(pExps.reduce((s, e) => s + Number(e.amountDzd || 0), 0));
      const netProfit = round2(cashReceived - totalExpenses);
      const totalBilled = periodInvoiced > 0 ? periodInvoiced : allInvoicedTotal;

      let outstandingReceivables = 0;
      let overdueReceivables = 0;
      let overdueCount = 0;
      const aging = { notDue: 0, d1_30: 0, d31_60: 0, d60Plus: 0 };
      const overdueList = [];
      invoices.forEach((inv) => {
        if (inv.docType !== 'FACTURE' || ['DRAFT', 'ANNULEE'].includes(inv.status) || inv.remainingDzd <= 0) return;
        outstandingReceivables = round2(outstandingReceivables + inv.remainingDzd);
        if (inv.isOverdue) {
          overdueReceivables = round2(overdueReceivables + inv.remainingDzd);
          overdueCount++;
          overdueList.push(inv);
          if (inv.daysOverdue <= 30) aging.d1_30 = round2(aging.d1_30 + inv.remainingDzd);
          else if (inv.daysOverdue <= 60) aging.d31_60 = round2(aging.d31_60 + inv.remainingDzd);
          else aging.d60Plus = round2(aging.d60Plus + inv.remainingDzd);
        } else {
          aging.notDue = round2(aging.notDue + inv.remainingDzd);
        }
      });

      const unpaidBills = db.supplierBills.filter((b) => b.status !== 'PAYEE');
      const supplierPayables = round2(unpaidBills.reduce((s, b) => {
        const total = Number(b.amountDzd || b.amount || 0);
        const paid = db.expenses.filter((e) => e.supplierBillId === b.id).reduce((sp, e) => sp + Number(e.amountDzd || e.amount || 0), 0);
        return s + Math.max(0, total - paid);
      }, 0));
      const overduePayables = round2(unpaidBills.filter((b) => b.dueDate < today).reduce((s, b) => {
        const total = Number(b.amountDzd || b.amount || 0);
        const paid = db.expenses.filter((e) => e.supplierBillId === b.id).reduce((sp, e) => sp + Number(e.amountDzd || e.amount || 0), 0);
        return s + Math.max(0, total - paid);
      }, 0));

      const mrr = round2(db.recurring.filter((r) => r.active).reduce((s, r) => {
        const c = computeTotals(r.items, r.discount, r.exchangeRate).totalDzd;
        return s + (r.frequency === 'QUARTERLY' ? c / 3 : r.frequency === 'YEARLY' ? c / 12 : c);
      }, 0));

      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const ci = round2(approvedPayments.filter((p) => p.paymentDate.startsWith(ym)).reduce((s, p) => s + Number(p.amountDzd || 0), 0));
        const ex = round2(db.expenses.filter((e) => e.date.startsWith(ym)).reduce((s, e) => s + Number(e.amountDzd || 0), 0));
        months.push({ month: ym, cashIn: ci, expenses: ex, profit: round2(ci - ex) });
      }

      const expCatMap = {};
      pExps.forEach((e) => { expCatMap[e.category] = round2((expCatMap[e.category] || 0) + Number(e.amountDzd || 0)); });
      const expensesByCategory = Object.entries(expCatMap).map(([category, total]) => ({
        category, total, pct: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0
      }));

      const topClients = db.clients.map((c) => ({
        id: c.id,
        name: c.company || c.name,
        received: round2(approvedPayments.filter((p) => p.clientId === c.id).reduce((s, p) => s + Number(p.amountDzd || 0), 0)),
        outstanding: round2(invoices.filter((i) => i.clientId === c.id && i.docType === 'FACTURE' && !['DRAFT', 'ANNULEE'].includes(i.status)).reduce((s, i) => s + i.remainingDzd, 0))
      })).filter((c) => c.received > 0 || c.outstanding > 0).sort((a, b) => b.received - a.received);

      const curYM = today.slice(0, 7);
      const bRow = db.budgets.find((b) => b.id === curYM) || { revenueTarget: 0, expenseBudgets: {} };
      const curMonthRev = round2(approvedPayments.filter((p) => p.paymentDate.startsWith(curYM)).reduce((s, p) => s + Number(p.amountDzd || 0), 0));
      const budgetVsActuals = {
        month: curYM,
        revenueTarget: Number(bRow.revenueTarget || 0),
        revenueActual: curMonthRev,
        categories: Object.entries(bRow.expenseBudgets || {}).map(([category, budget]) => {
          const actual = round2(db.expenses.filter((e) => e.date.startsWith(curYM) && e.category === category).reduce((s, e) => s + Number(e.amountDzd || 0), 0));
          return { category, budget: Number(budget), actual, over: Number(budget) > 0 && actual > Number(budget) };
        }).filter((c) => c.budget > 0 || c.actual > 0)
      };

      const avgExp = months.reduce((s, m) => s + m.expenses, 0) / 6;
      let runBal = treasuryBalance;
      const forecast = [1, 2, 3].map((off) => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() + off);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const dueIn = round2(invoices.filter((i) => i.docType === 'FACTURE' && i.remainingDzd > 0 && String(i.dueDate || '').startsWith(ym)).reduce((s, i) => s + i.remainingDzd, 0));
        const expIn = round2(mrr + dueIn);
        const billsOut = round2(db.supplierBills.filter((b) => b.status === 'A_PAYER' && String(b.dueDate || '').startsWith(ym)).reduce((s, b) => s + Number(b.amountDzd || 0), 0));
        const expOut = round2(Math.max(billsOut, avgExp));
        runBal = round2(runBal + expIn - expOut);
        return { month: ym, expectedIn: expIn, expectedOut: expOut, projectedBalance: runBal };
      });

      const statusCounts = { DRAFT: 0, SENT: 0, EN_ATTENTE: 0, EN_RETARD: 0, PAYEE: 0, ANNULEE: 0 };
      invoices.filter((i) => i.docType === 'FACTURE').forEach((i) => { statusCounts[i.displayStatus] = (statusCounts[i.displayStatus] || 0) + 1; });

      return {
        treasuryBalance,
        totalInvoiced: allInvoicedTotal,
        openingBalance: opening,
        kpis: {
          cashReceived, totalExpenses, expenseCount: pExps.length, netProfit,
          profitMargin: cashReceived > 0 ? Math.round((netProfit / cashReceived) * 100) : 0,
          totalBilled, collectionRate: totalBilled > 0 ? Math.min(100, Math.round((cashReceived / totalBilled) * 100)) : 0,
          outstandingReceivables, overdueReceivables, overdueCount,
          supplierPayables, overduePayables,
          dso: totalBilled > 0 ? Math.round((outstandingReceivables / totalBilled) * 30) : 0,
          mrr, activeSubscriptions: db.recurring.filter((r) => r.active).length
        },
        aging, overdueList, monthlyCashCurve: months, invoiceStatusBreakdown: statusCounts,
        expensesByCategory, topClients, budgetVsActuals, forecast, recentInvoices: invoices.slice(0, 6)
      };
    }

    case 'getBenefits': {
      const opening = Number(db.settings.openingTreasuryBalance || 0);
      const paidInvIds = new Set(db.payments.filter((p) => p.status !== 'REJECTED').map((p) => p.invoiceId));
      const invoiceRevenues = db.invoices
        .filter((i) => i.docType === 'FACTURE' && !['DRAFT', 'ANNULEE'].includes(i.status) && !paidInvIds.has(i.id))
        .map((i) => {
          const cl = db.clients.find((c) => c.id === i.clientId);
          return {
            id: `inv_${i.id}`,
            source: 'FACTURE',
            readOnly: true,
            date: i.issueDate || today,
            type: 'REVENUE',
            category: 'FACTURE_CLIENT',
            description: (cl ? (cl.company || cl.name) : (i.clientName || 'Facture Client')) + (i.number ? ` (${i.number})` : ''),
            amountDzd: Number(i.totalDzd || i.total || 0),
            notes: i.notes || ''
          };
        });

      const merged = [
        ...db.payments.filter((p) => p.status !== 'REJECTED').map((p) => {
          const cl = db.clients.find((c) => c.id === p.clientId);
          return { id: `pay_${p.id}`, source: 'INVOICE_PAYMENT', readOnly: true, date: p.paymentDate, type: 'REVENUE', category: 'CLIENT_PAYMENT', description: cl ? (cl.company || cl.name) : 'Client', amountDzd: Number(p.amountDzd), notes: p.notes };
        }),
        ...invoiceRevenues,
        ...db.expenses.map((e) => ({ id: `exp_${e.id}`, source: 'AGENCY_EXPENSE', readOnly: true, date: e.date, type: 'EXPENSE', category: e.category, description: e.description, amountDzd: Number(e.amountDzd), notes: e.notes })),
        ...db.benefits.map((b) => ({ ...b, source: 'MANUAL', readOnly: false, amountDzd: Number(b.amountDzd) }))
      ].sort((a, b) => b.date.localeCompare(a.date));

      const allRev = round2(merged.filter((t) => t.type === 'REVENUE').reduce((s, t) => s + t.amountDzd, 0));
      const allExp = round2(merged.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountDzd, 0));
      const allWith = round2(merged.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amountDzd, 0));

      const filtered = merged.filter((t) => (!payload.startDate || t.date >= payload.startDate) && (!payload.endDate || t.date <= payload.endDate));
      const pRev = round2(filtered.filter((t) => t.type === 'REVENUE').reduce((s, t) => s + t.amountDzd, 0));
      const pExp = round2(filtered.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountDzd, 0));
      const pWith = round2(filtered.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amountDzd, 0));

      const monthlySeries = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlySeries.push({
          month: ym,
          revenue: round2(merged.filter((t) => t.date.startsWith(ym) && t.type === 'REVENUE').reduce((s, t) => s + t.amountDzd, 0)),
          expense: round2(merged.filter((t) => t.date.startsWith(ym) && t.type === 'EXPENSE').reduce((s, t) => s + t.amountDzd, 0)),
          withdrawal: round2(merged.filter((t) => t.date.startsWith(ym) && t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amountDzd, 0))
        });
      }
      return {
        availableBalance: round2(opening + allRev - allExp - allWith),
        openingBalance: opening,
        period: { revenue: pRev, expense: pExp, withdrawal: pWith, netProfit: round2(pRev - pExp) },
        monthlySeries,
        transactions: filtered
      };
    }
    case 'saveBenefitTx': {
      const tx = payload.id ? { ...payload, amountDzd: Number(payload.amountDzd) } : { id: uid('ben'), ...payload, amountDzd: Number(payload.amountDzd) };
      if (payload.id) db.benefits = db.benefits.map((b) => (b.id === payload.id ? tx : b));
      else db.benefits.unshift(tx);
      saveDb(db);
      return { transaction: tx };
    }
    case 'deleteBenefitTx':
      db.benefits = db.benefits.filter((b) => b.id !== payload.id);
      saveDb(db);
      return { deleted: true };

    case 'listInvoices':
      return {
        invoices: db.invoices.map((i) => enrichInv(i, db)),
        recurring: db.recurring.map((r) => ({ ...r, clientName: db.clients.find((c) => c.id === r.clientId)?.company || '' }))
      };
    case 'saveInvoice': {
      const docType = payload.docType === 'DEVIS' ? 'DEVIS' : 'FACTURE';
      const rate = Number(payload.exchangeRate || (payload.currency === 'EUR' ? db.settings.eurRate : payload.currency === 'USD' ? db.settings.usdRate : 1)) || 1;
      const calc = computeTotals(payload.items, payload.discount, rate);

      // Resolve or auto-create client if clientName provided but clientId empty
      let clientId = payload.clientId || '';
      let clientName = (payload.clientName || '').trim();
      if (!clientId && clientName) {
        const existing = db.clients.find((c) => (c.company || c.name || '').trim().toLowerCase() === clientName.toLowerCase());
        if (existing) {
          clientId = existing.id;
          clientName = existing.company || existing.name;
        } else {
          clientId = uid('cli');
          const newCli = {
            id: clientId,
            name: clientName,
            company: clientName,
            email: '',
            phone: '',
            address: '',
            taxId: '',
            createdAt: today,
            updatedAt: today
          };
          db.clients.push(newCli);
        }
      } else if (clientId) {
        const c = db.clients.find((cl) => cl.id === clientId);
        if (c) clientName = c.company || c.name;
      }

      if (payload.id) {
        db.invoices = db.invoices.map((i) => (i.id === payload.id ? { ...i, ...payload, ...calc, clientId, clientName, exchangeRate: rate } : i));
        saveDb(db);
        const updated = db.invoices.find((i) => i.id === payload.id);
        return { invoice: enrichInv(updated, db) };
      }
      let number = '';
      if (payload.finalize) {
        db.counters[docType] = (db.counters[docType] || 0) + 1;
        number = `${docType === 'DEVIS' ? 'DEV' : 'FAC'}-${today.slice(0, 4)}-${String(db.counters[docType]).padStart(5, '0')}`;
      }
      const inv = {
        id: uid(docType === 'DEVIS' ? 'dev' : 'fac'),
        docType, number,
        clientId,
        clientName,
        status: payload.finalize ? 'EN_ATTENTE' : 'DRAFT',
        issueDate: payload.issueDate || today,
        dueDate: payload.dueDate || today,
        currency: payload.currency || 'DZD',
        exchangeRate: rate,
        ...calc,
        notes: payload.notes || '',
        publicToken: uid('pub'),
        sentAt: '', viewedAt: '', createdAt: today
      };
      db.invoices.unshift(inv);
      saveDb(db);
      return { invoice: enrichInv(inv, db) };
    }
    case 'finalizeInvoice': {
      const inv = db.invoices.find((i) => i.id === payload.id);
      if (inv && !inv.number) {
        db.counters[inv.docType] = (db.counters[inv.docType] || 0) + 1;
        inv.number = `${inv.docType === 'DEVIS' ? 'DEV' : 'FAC'}-${today.slice(0, 4)}-${String(db.counters[inv.docType]).padStart(5, '0')}`;
        inv.status = 'EN_ATTENTE';
        saveDb(db);
      }
      return { invoice: inv };
    }
    case 'convertQuoteToInvoice': {
      const q = db.invoices.find((i) => i.id === payload.id);
      if (!q) throw new Error('Quote not found');
      return runDemoAction('saveInvoice', { ...q, id: undefined, docType: 'FACTURE', finalize: true, convertedFromId: q.id }, user);
    }
    case 'deleteInvoice':
      db.invoices = db.invoices.filter((i) => i.id !== payload.id);
      // Cascade-delete linked payments so Dashboard & Treasury recalculate immediately
      db.payments = db.payments.filter((p) => p.invoiceId !== payload.id);
      saveDb(db);
      return { deleted: true };
    case 'recordPayment': {
      const inv = db.invoices.find((i) => i.id === payload.invoiceId);
      if (!inv) throw new Error('Invoice not found');
      const amount = round2(payload.amount || 0);
      const rate = Number(inv.exchangeRate || 1) || 1;
      const pay = {
        id: uid('pay'),
        invoiceId: inv.id,
        clientId: inv.clientId,
        amount,
        currency: inv.currency,
        exchangeRate: rate,
        amountDzd: round2(amount * rate),
        method: payload.method || 'VIREMENT',
        paymentDate: payload.paymentDate || today,
        reference: payload.reference || '',
        status: 'APPROVED',
        notes: payload.notes || ''
      };
      db.payments.push(pay);
      const totalPaid = round2(db.payments.filter((p) => p.invoiceId === inv.id && p.status !== 'REJECTED').reduce((s, p) => s + Number(p.amount), 0));
      if (totalPaid >= Number(inv.total) - 0.01) inv.status = 'PAYEE';
      saveDb(db);
      return { payment: pay };
    }
    case 'sendInvoiceEmail': {
      const inv = db.invoices.find((i) => i.id === payload.id);
      if (inv) { inv.sentAt = now; if (inv.status === 'EN_ATTENTE') inv.status = 'SENT'; saveDb(db); }
      return { sent: true };
    }
    case 'saveRecurring': {
      const rec = { id: payload.id || uid('rec'), ...payload, active: payload.active ?? true };
      if (payload.id) db.recurring = db.recurring.map((r) => (r.id === payload.id ? rec : r));
      else db.recurring.push(rec);
      saveDb(db);
      return { recurring: rec };
    }
    case 'deleteRecurring':
      db.recurring = db.recurring.filter((r) => r.id !== payload.id);
      saveDb(db);
      return { deleted: true };

    case 'listExpenses':
      return { expenses: db.expenses, budgets: db.budgets, categories: ['SALAIRES', 'LOYER', 'ADS', 'ABONNEMENTS', 'MATERIEL', 'IMPOTS', 'TRANSPORT', 'AUTRE'] };
    case 'saveExpense': {
      const rate = Number(payload.exchangeRate || (payload.currency === 'EUR' ? db.settings.eurRate : payload.currency === 'USD' ? db.settings.usdRate : 1)) || 1;
      const amount = round2(payload.amount || 0);
      const exp = { id: payload.id || uid('exp'), ...payload, amount, exchangeRate: rate, amountDzd: round2(amount * rate), receiptUrl: payload.receiptUrl || (payload.receiptFileName ? `#demo-receipt-${payload.receiptFileName}` : '') };
      if (payload.id) db.expenses = db.expenses.map((e) => (e.id === payload.id ? exp : e));
      else db.expenses.unshift(exp);
      saveDb(db);
      return { expense: exp };
    }
    case 'deleteExpense':
      db.expenses = db.expenses.filter((e) => e.id !== payload.id);
      saveDb(db);
      return { deleted: true };
    case 'saveBudgetGoal': {
      const id = `${payload.year}-${String(payload.month).padStart(2, '0')}`;
      const idx = db.budgets.findIndex((b) => b.id === id);
      const next = { id, year: Number(payload.year), month: Number(payload.month), revenueTarget: Number(payload.revenueTarget || 0), expenseBudgets: payload.expenseBudgets || {} };
      if (idx !== -1) db.budgets[idx] = { ...db.budgets[idx], ...next };
      else db.budgets.push(next);
      saveDb(db);
      return { budget: next };
    }

    case 'listSuppliers': {
      const expByBill = {};
      db.expenses.forEach((e) => {
        if (e.supplierBillId) {
          expByBill[e.supplierBillId] = round2((expByBill[e.supplierBillId] || 0) + Number(e.amountDzd || e.amount || 0));
        }
      });
      return {
        suppliers: db.suppliers,
        bills: db.supplierBills.map((b) => {
          const total = round2(b.amountDzd || b.amount || 0);
          const paid = round2(expByBill[b.id] || (b.status === 'PAYEE' ? total : (b.paidAmount || 0)));
          const remaining = round2(Math.max(0, total - paid));
          let status = b.status || 'A_PAYER';
          if (paid >= total - 0.01 && total > 0) status = 'PAYEE';
          else if (paid > 0) status = 'PARTIELLE';
          return {
            ...b,
            supplierName: db.suppliers.find((s) => s.id === b.supplierId)?.name || '',
            totalAmount: total,
            paidAmount: paid,
            remainingAmount: remaining,
            status
          };
        })
      };
    }
    case 'saveSupplier': {
      const s = { id: payload.id || uid('sup'), ...payload };
      if (payload.id) db.suppliers = db.suppliers.map((x) => (x.id === payload.id ? s : x));
      else db.suppliers.push(s);
      saveDb(db);
      return { supplier: s };
    }
    case 'deleteSupplier':
      db.suppliers = db.suppliers.filter((s) => s.id !== payload.id);
      saveDb(db);
      return { deleted: true };
    case 'saveSupplierBill': {
      const rate = Number(payload.exchangeRate || 1) || 1;
      const amount = round2(payload.amount || 0);
      const b = { id: payload.id || uid('bill'), status: 'A_PAYER', paidAmount: 0, remainingAmount: amount, ...payload, amount, exchangeRate: rate, amountDzd: round2(amount * rate) };
      if (payload.id) db.supplierBills = db.supplierBills.map((x) => (x.id === payload.id ? b : x));
      else db.supplierBills.unshift(b);
      saveDb(db);
      return { bill: b };
    }
    case 'recordSupplierBillPayment': {
      const billId = payload.billId || payload.id;
      const bill = db.supplierBills.find((b) => b.id === billId);
      if (!bill) throw new Error('Supplier bill not found');

      const total = round2(bill.amountDzd || bill.amount || 0);
      const previouslyPaid = round2(
        db.expenses.filter((e) => e.supplierBillId === bill.id)
          .reduce((s, e) => s + Number(e.amountDzd || e.amount || 0), 0)
      );
      const remaining = round2(Math.max(0, total - previouslyPaid));
      if (remaining <= 0) throw new Error('هذه الفاتورة مسددة بالكامل بالفعل.');

      const paymentAmount = round2(Math.min(remaining, Number(payload.amount || 0)));
      if (paymentAmount <= 0) throw new Error('يرجى إدخال مبلغ دفع صالح أكبر من 0.');

      const sup = db.suppliers.find((s) => s.id === bill.supplierId);
      const payDate = payload.date || payload.paymentDate || today;
      const method = payload.method || 'VIREMENT';

      const isFullyPaid = round2(previouslyPaid + paymentAmount) >= total - 0.01;
      const newStatus = isFullyPaid ? 'PAYEE' : 'PARTIELLE';

      const exp = {
        id: uid('exp'),
        date: payDate,
        category: bill.category || 'AUTRE',
        description: `[Versement Fournisseur: ${sup?.name || ''}] ${bill.description}${paymentAmount < remaining ? ' (دفعة جزئية)' : ' (تسديد كامل)'}`,
        amount: paymentAmount,
        currency: bill.currency || 'DZD',
        exchangeRate: bill.exchangeRate || 1,
        amountDzd: paymentAmount,
        supplierBillId: bill.id,
        notes: (payload.notes ? `${payload.notes} • ` : '') + `طريقة الدفع: ${method}`,
        receiptUrl: ''
      };
      db.expenses.unshift(exp);

      bill.status = newStatus;
      bill.paidAmount = round2(previouslyPaid + paymentAmount);
      if (isFullyPaid) bill.paidAt = payDate;
      bill.expenseId = exp.id;
      saveDb(db);

      return {
        bill: {
          ...bill,
          paidAmount: round2(previouslyPaid + paymentAmount),
          remainingAmount: round2(Math.max(0, remaining - paymentAmount)),
          status: newStatus
        },
        expense: exp
      };
    }
    case 'paySupplierBill': {
      const billId = payload.billId || payload.id;
      const bill = db.supplierBills.find((b) => b.id === billId);
      if (!bill) throw new Error('Supplier bill not found');
      const previouslyPaid = round2(
        db.expenses.filter((e) => e.supplierBillId === bill.id)
          .reduce((s, e) => s + Number(e.amountDzd || e.amount || 0), 0)
      );
      const remaining = round2(Math.max(0, Number(bill.amountDzd || bill.amount) - previouslyPaid));
      const payAmount = payload.amount ? Number(payload.amount) : remaining;
      return runDemoAction('recordSupplierBillPayment', {
        billId,
        amount: payAmount,
        date: payload.date || today,
        method: payload.method || 'VIREMENT',
        notes: payload.notes || 'تسديد فاتورة مورد'
      }, user);
    }
    case 'deleteSupplierBill':
      db.supplierBills = db.supplierBills.filter((b) => b.id !== payload.id);
      saveDb(db);
      return { deleted: true };

    case 'listLeads':
      return { leads: db.leads };
    case 'saveLead': {
      if (payload.id) {
        db.leads = db.leads.map((l) => {
          if (l.id !== payload.id) return l;
          const notes = payload.newNote ? [...(l.notes || []), { text: payload.newNote, author: user.name, createdAt: today }] : l.notes;
          return { ...l, ...payload, notes };
        });
      } else {
        db.leads.unshift({ id: uid('lead'), stage: 'NEW', source: 'WHATSAPP', currency: 'DZD', notes: [], convertedClientId: '', createdAt: today, ...payload });
      }
      saveDb(db);
      return { leads: db.leads };
    }
    case 'deleteLead':
      db.leads = db.leads.filter((l) => l.id !== payload.id);
      saveDb(db);
      return { deleted: true };
    case 'convertLeadToClient': {
      const lead = db.leads.find((l) => l.id === payload.id);
      if (!lead) throw new Error('Lead not found');
      const client = { id: uid('cli'), name: lead.name, company: lead.company || lead.name, email: lead.email || '', phone: lead.phone || '', address: '', taxId: '', defaultTaxRate: 19, tags: [lead.source], notes: [], portalToken: uid('portal'), createdAt: today };
      db.clients.unshift(client);
      lead.stage = 'WON';
      lead.convertedClientId = client.id;
      saveDb(db);
      return { client };
    }

    case 'listClients':
      return { clients: db.clients };
    case 'saveClient': {
      if (payload.id) {
        db.clients = db.clients.map((c) => {
          if (c.id !== payload.id) return c;
          const notes = payload.newNote ? [...(c.notes || []), { id: uid('nt'), text: payload.newNote, author: user.name, createdAt: today }] : (payload.notes || c.notes);
          return { ...c, ...payload, notes };
        });
      } else {
        db.clients.unshift({ id: uid('cli'), defaultTaxRate: 19, tags: [], notes: [], portalToken: uid('portal'), createdAt: today, ...payload });
      }
      saveDb(db);
      return { client: db.clients.find((c) => c.id === payload.id) || db.clients[0] };
    }
    case 'deleteClient':
      db.clients = db.clients.filter((c) => c.id !== payload.id);
      saveDb(db);
      return { deleted: true };
    case 'getClientDetail': {
      const client = db.clients.find((c) => c.id === payload.id);
      if (!client) throw new Error('Client not found');
      const invoices = db.invoices.filter((i) => i.clientId === client.id).map((i) => enrichInv(i, db));
      const financials = {
        totalInvoiced: round2(invoices.filter((i) => i.docType === 'FACTURE' && !['DRAFT', 'ANNULEE'].includes(i.status)).reduce((s, i) => s + i.totalDzd, 0)),
        totalPaid: round2(invoices.reduce((s, i) => s + i.paidDzd, 0)),
        totalRemaining: round2(invoices.filter((i) => i.docType === 'FACTURE' && !['DRAFT', 'ANNULEE'].includes(i.status)).reduce((s, i) => s + i.remainingDzd, 0)),
        totalOverdue: round2(invoices.filter((i) => i.isOverdue).reduce((s, i) => s + i.remainingDzd, 0))
      };
      return {
        client,
        financials,
        invoices,
        tasks: db.tasks.filter((t) => t.clientId === client.id),
        timeline: db.activityLog.filter((a) => a.clientId === client.id)
      };
    }

    case 'listServices':
      return { services: db.services };
    case 'saveService': {
      const charges = payload.charges || [];
      const totalCharges = round2(charges.reduce((s, c) => s + Number(c.amount || 0), 0));
      const salePrice = round2(payload.salePrice || 0);
      const srv = { id: payload.id || uid('srv'), ...payload, charges, totalCharges, netProfit: round2(salePrice - totalCharges) };
      if (payload.id) db.services = db.services.map((x) => (x.id === payload.id ? srv : x));
      else db.services.push(srv);
      saveDb(db);
      return { service: srv };
    }
    case 'deleteService':
      db.services = db.services.filter((s) => s.id !== payload.id);
      saveDb(db);
      return { deleted: true };

    case 'listAdSpend':
      return {
        adSpend: db.adSpend.map((r) => {
          const sp = Number(r.actualSpend || 0), bl = Number(r.amountBilled || 0), ord = Number(r.orders || 0), rev = Number(r.revenueGenerated || 0);
          return {
            ...r,
            clientName: db.clients.find((c) => c.id === r.clientId)?.company || '',
            agencyMargin: round2(bl - sp),
            roas: sp > 0 ? round2(rev / sp) : 0,
            cpa: ord > 0 ? round2(sp / ord) : 0
          };
        })
      };
    case 'saveAdSpend': {
      const rec = { id: payload.id || uid('ads'), ...payload };
      if (payload.id) db.adSpend = db.adSpend.map((x) => (x.id === payload.id ? rec : x));
      else db.adSpend.unshift(rec);
      saveDb(db);
      return { record: rec };
    }
    case 'deleteAdSpend':
      db.adSpend = db.adSpend.filter((a) => a.id !== payload.id);
      saveDb(db);
      return { deleted: true };

    case 'listTestili':
      return {
        tests: db.testili.map((t) => {
          const sp = Number(t.amountSpent || 0), ord = Number(t.orders || 0), rev = Number(t.revenue || 0);
          return {
            ...t,
            clientName: db.clients.find((c) => c.id === t.clientId)?.company || '',
            actualCpa: ord > 0 ? round2(sp / ord) : 0,
            actualRoas: sp > 0 ? round2(rev / sp) : 0
          };
        })
      };
    case 'saveTestili': {
      const rec = { id: payload.id || uid('tst'), createdAt: today, pushedToAdSpend: false, ...payload };
      if (payload.id) db.testili = db.testili.map((x) => (x.id === payload.id ? rec : x));
      else db.testili.unshift(rec);
      saveDb(db);
      return { test: rec };
    }
    case 'deleteTestili':
      db.testili = db.testili.filter((t) => t.id !== payload.id);
      saveDb(db);
      return { deleted: true };
    case 'pushTestiliToAdSpend': {
      const t = db.testili.find((x) => x.id === payload.id);
      if (t) {
        db.adSpend.unshift({
          id: uid('ads'), clientId: t.clientId, month: payload.month || today.slice(0, 7),
          platform: t.platform, campaignName: `[Testili] ${t.productName}`,
          clientAdBudget: t.testBudget, actualSpend: t.amountSpent,
          amountBilled: payload.amountBilled ?? t.amountSpent,
          orders: t.orders, revenueGenerated: t.revenue, notes: `Testili (${t.verdict})`
        });
        t.pushedToAdSpend = true;
        saveDb(db);
      }
      return { pushed: true };
    }

    case 'listTasks': {
      let list = db.tasks;
      if (user.role === 'TEAM') list = list.filter((t) => t.assignedTo === user.id);
      return {
        tasks: list.map((t) => ({
          ...t,
          clientName: db.clients.find((c) => c.id === t.clientId)?.company || '',
          assigneeName: db.users.find((u) => u.id === t.assignedTo)?.name || ''
        }))
      };
    }
    case 'saveTask': {
      if (payload.id) {
        db.tasks = db.tasks.map((t) => (t.id === payload.id ? { ...t, ...payload, updatedAt: today } : t));
      } else {
        db.tasks.push({ id: uid('tsk'), status: 'TODO', priority: 'MEDIUM', taskType: 'PROJECT', order: db.tasks.length, createdAt: today, updatedAt: today, ...payload });
      }
      saveDb(db);
      return { tasks: db.tasks };
    }
    case 'deleteTask':
      db.tasks = db.tasks.filter((t) => t.id !== payload.id);
      saveDb(db);
      return { deleted: true };

    case 'listTemplates':
      return { templates: db.templates };
    case 'saveTemplate': {
      const tpl = { id: payload.id || uid('tpl'), ...payload };
      if (payload.id) db.templates = db.templates.map((t) => (t.id === payload.id ? tpl : t));
      else db.templates.push(tpl);
      saveDb(db);
      return { template: tpl };
    }
    case 'deleteTemplate':
      db.templates = db.templates.filter((t) => t.id !== payload.id);
      saveDb(db);
      return { deleted: true };
    case 'applyTemplate': {
      const tpl = db.templates.find((t) => t.id === payload.templateId);
      const startMs = new Date((payload.startDate || today) + 'T00:00:00Z').getTime();
      const created = (tpl?.tasks || []).map((item, idx) => {
        const dueDate = new Date(startMs + (Number(item.dayOffset || idx + 1) * 86400000)).toISOString().slice(0, 10);
        const assignee = db.users.find((u) => u.role === item.defaultRole);
        const task = { id: uid('tsk'), title: item.title, description: `Template: ${tpl.name}`, clientId: payload.clientId, assignedTo: assignee?.id || '', status: 'TODO', priority: item.priority || 'MEDIUM', taskType: 'PROJECT', startDate: payload.startDate || today, dueDate, order: db.tasks.length + idx, updatedAt: today };
        db.tasks.push(task);
        return task;
      });
      saveDb(db);
      return { createdCount: created.length, tasks: created };
    }

    case 'getClientReport':
    case 'publicPortal': {
      const client = action === 'publicPortal'
        ? db.clients.find((c) => c.portalToken === payload.token) || db.clients[0]
        : db.clients.find((c) => c.id === payload.clientId) || db.clients[0];
      if (!client) return null;
      const ym = payload.month || today.slice(0, 7);
      const invoices = db.invoices.filter((i) => i.clientId === client.id && i.status !== 'DRAFT' && i.status !== 'ANNULEE').map((i) => enrichInv(i, db));
      const adSpend = db.adSpend.filter((a) => a.clientId === client.id && a.month === ym).map((r) => ({
        ...r,
        roas: Number(r.actualSpend) > 0 ? round2(Number(r.revenueGenerated) / Number(r.actualSpend)) : 0,
        cpa: Number(r.orders) > 0 ? round2(Number(r.actualSpend) / Number(r.orders)) : 0,
        agencyMargin: round2(Number(r.amountBilled) - Number(r.actualSpend))
      }));
      const adTotals = adSpend.reduce((a, r) => ({ budget: a.budget + Number(r.clientAdBudget), spend: a.spend + Number(r.actualSpend), billed: a.billed + Number(r.amountBilled), orders: a.orders + Number(r.orders), revenue: a.revenue + Number(r.revenueGenerated) }), { budget: 0, spend: 0, billed: 0, orders: 0, revenue: 0 });
      adTotals.roas = adTotals.spend > 0 ? round2(adTotals.revenue / adTotals.spend) : 0;
      adTotals.cpa = adTotals.orders > 0 ? round2(adTotals.spend / adTotals.orders) : 0;

      const report = {
        client,
        month: ym,
        financials: {
          monthInvoiced: round2(invoices.filter((i) => i.issueDate.startsWith(ym)).reduce((s, i) => s + i.totalDzd, 0)),
          monthPaid: round2(db.payments.filter((p) => p.clientId === client.id && p.paymentDate.startsWith(ym)).reduce((s, p) => s + Number(p.amountDzd), 0)),
          totalOutstanding: round2(invoices.filter((i) => i.docType === 'FACTURE').reduce((s, i) => s + i.remainingDzd, 0))
        },
        invoices,
        adSpend,
        adTotals,
        deliveredTasks: db.tasks.filter((t) => t.clientId === client.id && t.status === 'DONE'),
        testili: db.testili.filter((t) => t.clientId === client.id).map((t) => ({
          ...t,
          actualRoas: Number(t.amountSpent) > 0 ? round2(Number(t.revenue) / Number(t.amountSpent)) : 0,
          actualCpa: Number(t.orders) > 0 ? round2(Number(t.amountSpent) / Number(t.orders)) : 0
        }))
      };
      return action === 'publicPortal' ? { agency: db.settings, report } : report;
    }

    case 'globalSearch': {
      const q = String(payload.q || '').toLowerCase();
      return {
        clients: db.clients.filter((c) => `${c.name} ${c.company}`.toLowerCase().includes(q)),
        invoices: db.invoices.filter((i) => `${i.number} ${i.notes}`.toLowerCase().includes(q)),
        leads: db.leads.filter((l) => `${l.name} ${l.company}`.toLowerCase().includes(q)),
        tasks: db.tasks.filter((t) => t.title.toLowerCase().includes(q))
      };
    }

    case 'triggerBackup': {
      const bkp = { id: uid('bkp'), name: `Adpowrs_ERP_Backup_${now.slice(0, 16).replace('T', '_')}`, url: '#', createdAt: now };
      db.backups.unshift(bkp);
      db.settings.lastBackupAt = now;
      saveDb(db);
      return bkp;
    }
    case 'listBackups':
      return { backups: db.backups };
    case 'archiveYear':
      return { year: payload.year, archiveUrl: '#', archivedCounts: { Invoices: 0, Expenses: 0, Tasks: 0 }, newOpeningTreasuryBalance: db.settings.openingTreasuryBalance };

    default:
      return {};
  }
}
