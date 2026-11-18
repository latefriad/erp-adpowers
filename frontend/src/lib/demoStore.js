/**
 * Full-featured Local Demo Engine matching the Google Apps Script API contract.
 * Automatically activates ONLY when no Google Apps Script URL is connected yet,
 * so you can preview & test Adpowrs Digital ERP immediately!
 */

const STORAGE_KEY = 'adpowrs_demo_db_v1';

function seedDemoData() {
  const ym = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);
  const prevMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  return {
    settings: {
      agencyName: 'Adpowrs Digital',
      tagline: 'Performance Marketing & E-Commerce Growth',
      email: 'contact@adpowrs.com',
      phone: '+213 550 12 34 56',
      address: 'Hydra, Alger, Algérie',
      website: 'https://adpowrs.com',
      taxId: 'NIF 002616012345678',
      rcNumber: 'RC 16/00-0123456B26',
      nisNumber: 'NIS 002616012345',
      bankAccount: 'BEA 002 00012 1234567890 12',
      logoUrl: '',
      primaryColor: '#6366f1',
      secondaryColor: '#0ea5e9',
      defaultCurrency: 'DZD',
      defaultTaxRate: 19,
      eurRate: 245,
      usdRate: 225,
      openingTreasuryBalance: 450000,
      remindersEnabled: true,
      reminderLeadDays: 3,
      reminderIntervalDays: 5,
      portalBaseUrl: window.location.origin,
      lastBackupAt: new Date().toISOString()
    },
    users: [
      { id: 'usr_admin', name: 'Admin Adpowrs', email: 'admin@adpowrs.com', role: 'ADMIN', phone: '+213550123456', active: true, createdAt: today },
      { id: 'usr_acc', name: 'Karim Comptable', email: 'compta@adpowrs.com', role: 'ACCOUNTANT', phone: '+213661223344', active: true, createdAt: today },
      { id: 'usr_mb', name: 'Yacine Media Buyer', email: 'ads@adpowrs.com', role: 'MEDIA_BUYER', phone: '+213770556677', active: true, createdAt: today },
      { id: 'usr_team', name: 'Sara Creative', email: 'team@adpowrs.com', role: 'TEAM', phone: '+213555889900', active: true, createdAt: today }
    ],
    clients: [
      {
        id: 'cli_1',
        name: 'Amine Benali',
        company: 'DzCosmetics Store',
        email: 'amine@dzcosmetics.dz',
        phone: '0551234567',
        address: 'Oran, Algérie',
        taxId: '002431098765432',
        defaultTaxRate: 19,
        tags: ['E-Commerce', 'Meta Ads', 'VIP'],
        notes: [{ id: 'nt_1', text: 'Client prioritaire — scaling TikTok prévu le mois prochain.', author: 'Admin Adpowrs', createdAt: today }],
        portalToken: 'demo-dzcosmetics-portal',
        createdAt: today
      },
      {
        id: 'cli_2',
        name: 'Lina Mansouri',
        company: 'Aura Mode DZ',
        email: 'lina@auramode.dz',
        phone: '0662345678',
        address: 'Alger, Algérie',
        taxId: '',
        defaultTaxRate: 19,
        tags: ['Fashion', 'Testili'],
        notes: [],
        portalToken: 'demo-auramode-portal',
        createdAt: today
      },
      {
        id: 'cli_3',
        name: 'Mehdi Kaci',
        company: 'TechGear Algérie',
        email: 'mehdi@techgear.dz',
        phone: '0773456789',
        address: 'Sétif, Algérie',
        taxId: '',
        defaultTaxRate: 19,
        tags: ['E-Commerce', 'Website'],
        notes: [],
        portalToken: 'demo-techgear-portal',
        createdAt: today
      }
    ],
    leads: [
      { id: 'lead_1', name: 'Nabil Ouali', company: 'Parfum El Djazair', phone: '0554998877', email: 'nabil@parfum.dz', source: 'WHATSAPP', stage: 'NEGOTIATION', estimatedValue: 180000, currency: 'DZD', followUpDate: today, assignedTo: 'usr_mb', notes: [{ text: 'Intéressé par Pack Meta Ads + 10 vidéos', author: 'Admin Adpowrs', createdAt: today }], convertedClientId: '', createdAt: today },
      { id: 'lead_2', name: 'Rania Haddad', company: 'BioCare Lab', phone: '0661776655', email: 'rania@biocare.dz', source: 'ADS', stage: 'QUOTE_SENT', estimatedValue: 120000, currency: 'DZD', followUpDate: '2026-11-10', assignedTo: 'usr_mb', notes: [], convertedClientId: '', createdAt: today },
      { id: 'lead_3', name: 'Sofiane Boudiaf', company: 'ElectroHome', phone: '0770112233', email: '', source: 'REFERRAL', stage: 'NEW', estimatedValue: 250000, currency: 'DZD', followUpDate: today, assignedTo: 'usr_admin', notes: [], convertedClientId: '', createdAt: today }
    ],
    services: [
      { id: 'srv_1', name: 'Gestion Meta Ads (Mensuel)', category: 'ADS', description: 'Media buying + reporting + optimisation', basePrice: 20000, salePrice: 80000, charges: [{ label: 'Créas & Setup', amount: 15000 }], totalCharges: 15000, netProfit: 65000, currency: 'DZD' },
      { id: 'srv_2', name: 'Pack Testili (5 Produits)', category: 'TESTILI', description: 'Recherche + Landing + Tests Ads', basePrice: 15000, salePrice: 55000, charges: [{ label: 'Montage Vidéo', amount: 12000 }], totalCharges: 12000, netProfit: 43000, currency: 'DZD' },
      { id: 'srv_3', name: 'Landing Page COD Conversion', category: 'WEBSITE', description: 'Design + Dev + Pixel + CAPI', basePrice: 25000, salePrice: 95000, charges: [{ label: 'Domaine & Hosting', amount: 8000 }], totalCharges: 8000, netProfit: 87000, currency: 'DZD' }
    ],
    invoices: [
      {
        id: 'fac_1', docType: 'FACTURE', number: 'FAC-2026-00001', clientId: 'cli_1', status: 'PAYEE',
        issueDate: `${ym}-02`, dueDate: `${ym}-12`, currency: 'DZD', exchangeRate: 1,
        items: [{ description: 'Gestion Meta Ads + Créatives (Mensuel)', quantity: 1, unitPrice: 150000, taxRate: 19, lineTotal: 178500 }],
        subtotal: 150000, discount: 0, taxTotal: 28500, total: 178500, totalDzd: 178500,
        notes: 'Merci pour votre confiance.', publicToken: 'pub-fac-001', sentAt: `${ym}-02`, viewedAt: `${ym}-03`, createdAt: `${ym}-02`
      },
      {
        id: 'fac_2', docType: 'FACTURE', number: 'FAC-2026-00002', clientId: 'cli_2', status: 'EN_ATTENTE',
        issueDate: `${prevMonth}-18`, dueDate: `${prevMonth}-28`, currency: 'DZD', exchangeRate: 1,
        items: [{ description: 'Pack Testili + Gestion TikTok Ads', quantity: 1, unitPrice: 95000, taxRate: 19, lineTotal: 113050 }],
        subtotal: 95000, discount: 0, taxTotal: 18050, total: 113050, totalDzd: 113050,
        notes: '', publicToken: 'pub-fac-002', sentAt: `${prevMonth}-18`, viewedAt: '', createdAt: `${prevMonth}-18`
      },
      {
        id: 'fac_3', docType: 'FACTURE', number: 'FAC-2026-00003', clientId: 'cli_3', status: 'SENT',
        issueDate: `${ym}-10`, dueDate: `${ym}-28`, currency: 'EUR', exchangeRate: 245,
        items: [{ description: 'Création Store E-Commerce + Tracking CAPI', quantity: 1, unitPrice: 600, taxRate: 0, lineTotal: 600 }],
        subtotal: 600, discount: 0, taxTotal: 0, total: 600, totalDzd: 147000,
        notes: 'Paiement par virement.', publicToken: 'pub-fac-003', sentAt: `${ym}-10`, viewedAt: `${ym}-11`, createdAt: `${ym}-10`
      },
      {
        id: 'dev_1', docType: 'DEVIS', number: 'DEV-2026-00001', clientId: 'cli_1', status: 'SENT',
        issueDate: today, dueDate: `${ym}-30`, currency: 'DZD', exchangeRate: 1,
        items: [{ description: 'Pack 15 Vidéos UGC Performance', quantity: 1, unitPrice: 120000, taxRate: 19, lineTotal: 142800 }],
        subtotal: 120000, discount: 0, taxTotal: 22800, total: 142800, totalDzd: 142800,
        notes: 'Valable 15 jours.', publicToken: 'pub-dev-001', sentAt: today, viewedAt: '', createdAt: today
      }
    ],
    payments: [
      { id: 'pay_1', invoiceId: 'fac_1', clientId: 'cli_1', amount: 178500, currency: 'DZD', exchangeRate: 1, amountDzd: 178500, method: 'VIREMENT', paymentDate: `${ym}-05`, reference: 'VIR-9021', status: 'APPROVED', notes: '' },
      { id: 'pay_2', invoiceId: 'fac_3', clientId: 'cli_3', amount: 300, currency: 'EUR', exchangeRate: 245, amountDzd: 73500, method: 'VIREMENT', paymentDate: `${ym}-12`, reference: 'ACOMPTE-50', status: 'APPROVED', notes: 'Acompte 50%' }
    ],
    recurring: [
      { id: 'rec_1', clientId: 'cli_1', title: 'Retainer Meta Ads DzCosmetics', frequency: 'MONTHLY', currency: 'DZD', exchangeRate: 1, items: [{ description: 'Gestion Meta Ads Mensuel', quantity: 1, unitPrice: 150000, taxRate: 19 }], discount: 0, nextRunAt: '2026-12-01', active: true }
    ],
    expenses: [
      { id: 'exp_1', date: `${ym}-03`, category: 'LOYER', description: 'Loyer bureau Hydra', amount: 65000, currency: 'DZD', exchangeRate: 1, amountDzd: 65000, receiptUrl: '', notes: '' },
      { id: 'exp_2', date: `${ym}-06`, category: 'ABONNEMENTS', description: 'Suite Adobe + Figma + Vercel + AI', amount: 120, currency: 'USD', exchangeRate: 225, amountDzd: 27000, receiptUrl: '', notes: '' },
      { id: 'exp_3', date: `${ym}-09`, category: 'ADS', description: 'Campagne acquisition Adpowrs Digital', amount: 35000, currency: 'DZD', exchangeRate: 1, amountDzd: 35000, receiptUrl: '', notes: '' }
    ],
    budgets: [
      { id: ym, year: Number(ym.slice(0, 4)), month: Number(ym.slice(5, 7)), revenueTarget: 400000, expenseBudgets: { LOYER: 70000, ADS: 50000, ABONNEMENTS: 35000, SALAIRES: 120000 } }
    ],
    suppliers: [
      { id: 'sup_1', name: 'Studio Vidéo Pro Alger', category: 'MATERIEL', email: 'studio@alger.dz', phone: '0550987654', notes: 'Tournage UGC' },
      { id: 'sup_2', name: 'Freelance Motion Design', category: 'SALAIRES', email: 'motion@dz.com', phone: '0661445566', notes: '' }
    ],
    supplierBills: [
      { id: 'bill_1', supplierId: 'sup_1', description: 'Shooting 10 produits DzCosmetics', category: 'MATERIEL', amount: 32000, currency: 'DZD', exchangeRate: 1, amountDzd: 32000, dueDate: `${ym}-25`, status: 'A_PAYER', paidAt: '', expenseId: '', notes: '' }
    ],
    benefits: [
      { id: 'ben_1', date: `${ym}-08`, type: 'WITHDRAWAL', category: 'PERSONAL', description: 'Retrait personnel fondateur', amountDzd: 50000, notes: '' }
    ],
    adSpend: [
      { id: 'ads_1', clientId: 'cli_1', month: ym, platform: 'META', campaignName: 'Scaling Sérum Vitamine C', clientAdBudget: 200000, actualSpend: 165000, amountBilled: 195000, orders: 412, revenueGenerated: 1150000, notes: 'ROAS excellent sur wilayas nord' },
      { id: 'ads_2', clientId: 'cli_2', month: ym, platform: 'TIKTOK', campaignName: 'Collection Automne Abaya', clientAdBudget: 120000, actualSpend: 92000, amountBilled: 110000, orders: 185, revenueGenerated: 620000, notes: '' }
    ],
    testili: [
      { id: 'tst_1', clientId: 'cli_1', productName: 'Brosse Nettoyante Visage 3D', productUrl: 'https://dzcosmetics.dz/brosse', platform: 'META', testBudget: 25000, amountSpent: 19500, orders: 48, revenue: 134400, targetCpa: 450, targetRoas: 5, status: 'COMPLETED', verdict: 'WINNER', verdictNotes: 'CPA 406 DZD — prêt pour scaling CBO!', pushedToAdSpend: true, createdAt: today },
      { id: 'tst_2', clientId: 'cli_2', productName: 'Sac Cuir Minimaliste', productUrl: '', platform: 'TIKTOK', testBudget: 20000, amountSpent: 14000, orders: 12, revenue: 42000, targetCpa: 600, targetRoas: 4, status: 'RUNNING', verdict: 'NEEDS_MORE_DATA', verdictNotes: 'Tester nouveaux hooks UGC', pushedToAdSpend: false, createdAt: today }
    ],
    tasks: [
      { id: 'tsk_1', title: 'Audit Pixel & CAPI DzCosmetics', description: 'Vérifier événements Purchase & InitiateCheckout', clientId: 'cli_1', assignedTo: 'usr_mb', status: 'DONE', priority: 'HIGH', taskType: 'PROJECT', startDate: `${ym}-01`, dueDate: `${ym}-05`, order: 0, updatedAt: today },
      { id: 'tsk_2', title: 'Montage 5 Reels TikTok Aura Mode', description: 'Sous-titres dynamiques AR/FR', clientId: 'cli_2', assignedTo: 'usr_team', status: 'INPROGRESS', priority: 'HIGH', taskType: 'WEEKLY', startDate: `${ym}-12`, dueDate: `${ym}-20`, order: 1, updatedAt: today },
      { id: 'tsk_3', title: 'Landing Page COD Brosse 3D', description: 'Version mobile-first avec formulaire rapide', clientId: 'cli_1', assignedTo: 'usr_team', status: 'TODO', priority: 'MEDIUM', taskType: 'PROJECT', startDate: today, dueDate: `${ym}-24`, order: 2, updatedAt: today }
    ],
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
    activityLog: [
      { id: 'act_1', entityType: 'INVOICE', entityId: 'fac_1', clientId: 'cli_1', action: 'INVOICE_PAID', summary: 'Paiement de 178 500 DZD reçu sur FAC-2026-00001', actorName: 'Admin Adpowrs', createdAt: `${ym}-05T10:00:00Z` },
      { id: 'act_2', entityType: 'CLIENT', entityId: 'cli_1', clientId: 'cli_1', action: 'CLIENT_CREATED', summary: 'Client DzCosmetics Store créé', actorName: 'Admin Adpowrs', createdAt: `${ym}-01T09:00:00Z` }
    ],
    backups: [
      { id: 'bkp_1', name: `Adpowrs_ERP_Backup_${today}_02-00`, url: '#', createdAt: new Date().toISOString() }
    ],
    counters: { FACTURE: 3, DEVIS: 1 }
  };
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const seeded = seedDemoData();
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

function enrichInv(inv, db) {
  const pays = db.payments.filter((p) => p.invoiceId === inv.id && p.status !== 'REJECTED');
  const paidAmount = pays.reduce((s, p) => s + Number(p.amount || 0), 0);
  const paidDzd = pays.reduce((s, p) => s + Number(p.amountDzd || 0), 0);
  const total = Number(inv.total || 0);
  const totalDzd = Number(inv.totalDzd || total * Number(inv.exchangeRate || 1));
  const remaining = Math.max(0, total - paidAmount);
  const remainingDzd = Math.max(0, totalDzd - paidDzd);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = inv.docType === 'FACTURE' && !['DRAFT', 'ANNULEE', 'PAYEE'].includes(inv.status) && remaining > 0 && inv.dueDate && inv.dueDate < today;
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
    clientName: client ? (client.company || client.name) : '',
    clientEmail: client?.email || '',
    clientPhone: client?.phone || ''
  };
}

function computeTotals(items = [], discount = 0, rate = 1) {
  let subtotal = 0, taxTotal = 0;
  const norm = items.map((it) => {
    const qty = Number(it.quantity || 1);
    const up = Number(it.unitPrice || 0);
    const tr = Number(it.taxRate ?? 19);
    const net = qty * up;
    const tax = net * (tr / 100);
    subtotal += net;
    taxTotal += tax;
    return { description: it.description || '', quantity: qty, unitPrice: up, taxRate: tr, lineTotal: Math.round((net + tax) * 100) / 100 };
  });
  const disc = Number(discount || 0);
  const total = Math.max(0, Math.round((subtotal - disc + taxTotal) * 100) / 100);
  return { items: norm, subtotal: Math.round(subtotal * 100) / 100, discount: disc, taxTotal: Math.round(taxTotal * 100) / 100, total, totalDzd: Math.round(total * Number(rate || 1) * 100) / 100 };
}

export async function runDemoAction(action, payload = {}, currentUser = null) {
  const db = loadDb();
  const user = currentUser || db.users[0];
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  switch (action) {
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
      const allIn = db.payments.reduce((s, p) => s + Number(p.amountDzd || 0), 0);
      const allOut = db.expenses.reduce((s, e) => s + Number(e.amountDzd || 0), 0);
      const treasuryBalance = opening + allIn - allOut;

      const start = payload.startDate || `${today.slice(0, 7)}-01`;
      const end = payload.endDate || `${today.slice(0, 7)}-31`;
      const pPays = db.payments.filter((p) => p.paymentDate >= start && p.paymentDate <= end);
      const pExps = db.expenses.filter((e) => e.date >= start && e.date <= end);
      const pInvs = invoices.filter((i) => i.docType === 'FACTURE' && !['DRAFT', 'ANNULEE'].includes(i.status) && i.issueDate >= start && i.issueDate <= end);

      const cashReceived = pPays.reduce((s, p) => s + Number(p.amountDzd || 0), 0);
      const totalExpenses = pExps.reduce((s, e) => s + Number(e.amountDzd || 0), 0);
      const netProfit = cashReceived - totalExpenses;
      const totalBilled = pInvs.reduce((s, i) => s + Number(i.totalDzd || 0), 0);

      let outstandingReceivables = 0, overdueReceivables = 0, overdueCount = 0;
      const aging = { notDue: 0, d1_30: 0, d31_60: 0, d60Plus: 0 };
      const overdueList = [];
      invoices.forEach((inv) => {
        if (inv.docType !== 'FACTURE' || ['DRAFT', 'ANNULEE'].includes(inv.status) || inv.remainingDzd <= 0) return;
        outstandingReceivables += inv.remainingDzd;
        if (inv.isOverdue) {
          overdueReceivables += inv.remainingDzd;
          overdueCount++;
          overdueList.push(inv);
          if (inv.daysOverdue <= 30) aging.d1_30 += inv.remainingDzd;
          else if (inv.daysOverdue <= 60) aging.d31_60 += inv.remainingDzd;
          else aging.d60Plus += inv.remainingDzd;
        } else aging.notDue += inv.remainingDzd;
      });

      const supplierPayables = db.supplierBills.filter((b) => b.status === 'A_PAYER').reduce((s, b) => s + Number(b.amountDzd || 0), 0);
      const overduePayables = db.supplierBills.filter((b) => b.status === 'A_PAYER' && b.dueDate < today).reduce((s, b) => s + Number(b.amountDzd || 0), 0);

      const mrr = db.recurring.filter((r) => r.active).reduce((s, r) => {
        const c = computeTotals(r.items, r.discount, r.exchangeRate).totalDzd;
        return s + (r.frequency === 'QUARTERLY' ? c / 3 : r.frequency === 'YEARLY' ? c / 12 : c);
      }, 0);

      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const ym = d.toISOString().slice(0, 7);
        const ci = db.payments.filter((p) => p.paymentDate.startsWith(ym)).reduce((s, p) => s + Number(p.amountDzd || 0), 0);
        const ex = db.expenses.filter((e) => e.date.startsWith(ym)).reduce((s, e) => s + Number(e.amountDzd || 0), 0);
        months.push({ month: ym, cashIn: ci, expenses: ex, profit: ci - ex });
      }

      const expCatMap = {};
      pExps.forEach((e) => { expCatMap[e.category] = (expCatMap[e.category] || 0) + Number(e.amountDzd || 0); });
      const expensesByCategory = Object.entries(expCatMap).map(([category, total]) => ({
        category, total, pct: totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0
      }));

      const topClients = db.clients.map((c) => ({
        id: c.id,
        name: c.company || c.name,
        received: db.payments.filter((p) => p.clientId === c.id).reduce((s, p) => s + Number(p.amountDzd || 0), 0),
        outstanding: invoices.filter((i) => i.clientId === c.id && i.docType === 'FACTURE' && !['DRAFT', 'ANNULEE'].includes(i.status)).reduce((s, i) => s + i.remainingDzd, 0)
      })).sort((a, b) => b.received - a.received);

      const curYM = today.slice(0, 7);
      const bRow = db.budgets.find((b) => b.id === curYM) || { revenueTarget: 0, expenseBudgets: {} };
      const budgetVsActuals = {
        month: curYM,
        revenueTarget: Number(bRow.revenueTarget || 0),
        revenueActual: cashReceived,
        categories: Object.entries(bRow.expenseBudgets || {}).map(([category, budget]) => {
          const actual = db.expenses.filter((e) => e.date.startsWith(curYM) && e.category === category).reduce((s, e) => s + Number(e.amountDzd || 0), 0);
          return { category, budget: Number(budget), actual, over: Number(budget) > 0 && actual > Number(budget) };
        })
      };

      let runBal = treasuryBalance;
      const forecast = [1, 2, 3].map((off) => {
        const d = new Date();
        d.setMonth(d.getMonth() + off);
        const ym = d.toISOString().slice(0, 7);
        const expIn = Math.round(mrr + outstandingReceivables * (off === 1 ? 0.5 : 0.2));
        const expOut = Math.round(Math.max(totalExpenses, 90000));
        runBal += expIn - expOut;
        return { month: ym, expectedIn: expIn, expectedOut: expOut, projectedBalance: runBal };
      });

      const statusCounts = { DRAFT: 0, SENT: 0, EN_ATTENTE: 0, EN_RETARD: 0, PAYEE: 0, ANNULEE: 0 };
      invoices.filter((i) => i.docType === 'FACTURE').forEach((i) => { statusCounts[i.displayStatus] = (statusCounts[i.displayStatus] || 0) + 1; });

      return {
        treasuryBalance,
        openingBalance: opening,
        kpis: {
          cashReceived, totalExpenses, expenseCount: pExps.length, netProfit,
          profitMargin: cashReceived > 0 ? Math.round((netProfit / cashReceived) * 100) : 0,
          totalBilled, collectionRate: totalBilled > 0 ? Math.min(100, Math.round((cashReceived / totalBilled) * 100)) : 0,
          outstandingReceivables, overdueReceivables, overdueCount,
          supplierPayables, overduePayables,
          dso: totalBilled > 0 ? Math.round((outstandingReceivables / totalBilled) * 30) : 0,
          mrr: Math.round(mrr), activeSubscriptions: db.recurring.filter((r) => r.active).length
        },
        aging, overdueList, monthlyCashCurve: months, invoiceStatusBreakdown: statusCounts,
        expensesByCategory, topClients, budgetVsActuals, forecast, recentInvoices: invoices.slice(0, 6)
      };
    }

    case 'getBenefits': {
      const opening = Number(db.settings.openingTreasuryBalance || 0);
      const merged = [
        ...db.payments.map((p) => {
          const cl = db.clients.find((c) => c.id === p.clientId);
          return { id: `pay_${p.id}`, source: 'INVOICE_PAYMENT', readOnly: true, date: p.paymentDate, type: 'REVENUE', category: 'CLIENT_PAYMENT', description: cl ? (cl.company || cl.name) : 'Client', amountDzd: Number(p.amountDzd), notes: p.notes };
        }),
        ...db.expenses.map((e) => ({ id: `exp_${e.id}`, source: 'AGENCY_EXPENSE', readOnly: true, date: e.date, type: 'EXPENSE', category: e.category, description: e.description, amountDzd: Number(e.amountDzd), notes: e.notes })),
        ...db.benefits.map((b) => ({ ...b, source: 'MANUAL', readOnly: false, amountDzd: Number(b.amountDzd) }))
      ].sort((a, b) => b.date.localeCompare(a.date));

      const allRev = merged.filter((t) => t.type === 'REVENUE').reduce((s, t) => s + t.amountDzd, 0);
      const allExp = merged.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountDzd, 0);
      const allWith = merged.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amountDzd, 0);

      const filtered = merged.filter((t) => (!payload.startDate || t.date >= payload.startDate) && (!payload.endDate || t.date <= payload.endDate));
      const pRev = filtered.filter((t) => t.type === 'REVENUE').reduce((s, t) => s + t.amountDzd, 0);
      const pExp = filtered.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountDzd, 0);
      const pWith = filtered.filter((t) => t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amountDzd, 0);

      const monthlySeries = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const ym = d.toISOString().slice(0, 7);
        monthlySeries.push({
          month: ym,
          revenue: merged.filter((t) => t.date.startsWith(ym) && t.type === 'REVENUE').reduce((s, t) => s + t.amountDzd, 0),
          expense: merged.filter((t) => t.date.startsWith(ym) && t.type === 'EXPENSE').reduce((s, t) => s + t.amountDzd, 0),
          withdrawal: merged.filter((t) => t.date.startsWith(ym) && t.type === 'WITHDRAWAL').reduce((s, t) => s + t.amountDzd, 0)
        });
      }
      return {
        availableBalance: opening + allRev - allExp - allWith,
        openingBalance: opening,
        period: { revenue: pRev, expense: pExp, withdrawal: pWith, netProfit: pRev - pExp },
        monthlySeries,
        transactions: filtered
      };
    }
    case 'saveBenefitTx': {
      const tx = payload.id ? { ...payload } : { id: uid('ben'), ...payload, amountDzd: Number(payload.amountDzd) };
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
      const rate = Number(payload.exchangeRate || (payload.currency === 'EUR' ? db.settings.eurRate : payload.currency === 'USD' ? db.settings.usdRate : 1));
      const calc = computeTotals(payload.items, payload.discount, rate);
      if (payload.id) {
        db.invoices = db.invoices.map((i) => (i.id === payload.id ? { ...i, ...payload, ...calc, exchangeRate: rate } : i));
        saveDb(db);
        return { invoice: db.invoices.find((i) => i.id === payload.id) };
      }
      let number = '';
      if (payload.finalize) {
        db.counters[docType] = (db.counters[docType] || 0) + 1;
        number = `${docType === 'DEVIS' ? 'DEV' : 'FAC'}-${today.slice(0, 4)}-${String(db.counters[docType]).padStart(5, '0')}`;
      }
      const inv = {
        id: uid(docType === 'DEVIS' ? 'dev' : 'fac'),
        docType, number, clientId: payload.clientId, status: payload.finalize ? 'EN_ATTENTE' : 'DRAFT',
        issueDate: payload.issueDate || today, dueDate: payload.dueDate || today,
        currency: payload.currency || 'DZD', exchangeRate: rate, ...calc,
        notes: payload.notes || '', publicToken: uid('pub'), sentAt: '', viewedAt: '', createdAt: today
      };
      db.invoices.unshift(inv);
      saveDb(db);
      return { invoice: inv };
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
      saveDb(db);
      return { deleted: true };
    case 'recordPayment': {
      const inv = db.invoices.find((i) => i.id === payload.invoiceId);
      const amount = Number(payload.amount || 0);
      const rate = Number(inv?.exchangeRate || 1);
      const pay = { id: uid('pay'), invoiceId: inv.id, clientId: inv.clientId, amount, currency: inv.currency, exchangeRate: rate, amountDzd: amount * rate, method: payload.method || 'VIREMENT', paymentDate: payload.paymentDate || today, reference: payload.reference || '', status: 'APPROVED', notes: payload.notes || '' };
      db.payments.push(pay);
      const totalPaid = db.payments.filter((p) => p.invoiceId === inv.id).reduce((s, p) => s + Number(p.amount), 0);
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
      const rate = Number(payload.exchangeRate || (payload.currency === 'EUR' ? db.settings.eurRate : payload.currency === 'USD' ? db.settings.usdRate : 1));
      const amount = Number(payload.amount || 0);
      const exp = { id: payload.id || uid('exp'), ...payload, amount, exchangeRate: rate, amountDzd: amount * rate, receiptUrl: payload.receiptUrl || (payload.receiptFileName ? `#demo-receipt-${payload.receiptFileName}` : '') };
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

    case 'listSuppliers':
      return {
        suppliers: db.suppliers,
        bills: db.supplierBills.map((b) => ({ ...b, supplierName: db.suppliers.find((s) => s.id === b.supplierId)?.name || '' }))
      };
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
      const rate = Number(payload.exchangeRate || 1);
      const amount = Number(payload.amount || 0);
      const b = { id: payload.id || uid('bill'), status: 'A_PAYER', ...payload, amount, exchangeRate: rate, amountDzd: amount * rate };
      if (payload.id) db.supplierBills = db.supplierBills.map((x) => (x.id === payload.id ? b : x));
      else db.supplierBills.unshift(b);
      saveDb(db);
      return { bill: b };
    }
    case 'paySupplierBill': {
      const bill = db.supplierBills.find((b) => b.id === payload.id);
      if (bill && bill.status !== 'PAYEE') {
        const sup = db.suppliers.find((s) => s.id === bill.supplierId);
        const exp = { id: uid('exp'), date: today, category: bill.category || 'AUTRE', description: `[Fournisseur: ${sup?.name || ''}] ${bill.description}`, amount: bill.amount, currency: bill.currency || 'DZD', exchangeRate: bill.exchangeRate || 1, amountDzd: bill.amountDzd, supplierBillId: bill.id, notes: bill.notes || '' };
        db.expenses.unshift(exp);
        bill.status = 'PAYEE';
        bill.paidAt = today;
        bill.expenseId = exp.id;
        saveDb(db);
      }
      return { bill };
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
      const invoices = db.invoices.filter((i) => i.clientId === client.id).map((i) => enrichInv(i, db));
      const financials = {
        totalInvoiced: invoices.filter((i) => i.docType === 'FACTURE' && !['DRAFT', 'ANNULEE'].includes(i.status)).reduce((s, i) => s + i.totalDzd, 0),
        totalPaid: invoices.reduce((s, i) => s + i.paidDzd, 0),
        totalRemaining: invoices.filter((i) => i.docType === 'FACTURE').reduce((s, i) => s + i.remainingDzd, 0),
        totalOverdue: invoices.filter((i) => i.isOverdue).reduce((s, i) => s + i.remainingDzd, 0)
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
      const totalCharges = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
      const salePrice = Number(payload.salePrice || 0);
      const srv = { id: payload.id || uid('srv'), ...payload, charges, totalCharges, netProfit: salePrice - totalCharges };
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
            agencyMargin: bl - sp,
            roas: sp > 0 ? Math.round((rev / sp) * 100) / 100 : 0,
            cpa: ord > 0 ? Math.round((sp / ord) * 100) / 100 : 0
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
            actualCpa: ord > 0 ? Math.round((sp / ord) * 100) / 100 : 0,
            actualRoas: sp > 0 ? Math.round((rev / sp) * 100) / 100 : 0
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
      const ym = payload.month || today.slice(0, 7);
      const invoices = db.invoices.filter((i) => i.clientId === client.id && i.status !== 'DRAFT' && i.status !== 'ANNULEE').map((i) => enrichInv(i, db));
      const adSpend = db.adSpend.filter((a) => a.clientId === client.id && a.month === ym).map((r) => ({
        ...r,
        roas: Number(r.actualSpend) > 0 ? Math.round((Number(r.revenueGenerated) / Number(r.actualSpend)) * 100) / 100 : 0,
        cpa: Number(r.orders) > 0 ? Math.round((Number(r.actualSpend) / Number(r.orders)) * 100) / 100 : 0,
        agencyMargin: Number(r.amountBilled) - Number(r.actualSpend)
      }));
      const adTotals = adSpend.reduce((a, r) => ({ budget: a.budget + Number(r.clientAdBudget), spend: a.spend + Number(r.actualSpend), billed: a.billed + Number(r.amountBilled), orders: a.orders + Number(r.orders), revenue: a.revenue + Number(r.revenueGenerated) }), { budget: 0, spend: 0, billed: 0, orders: 0, revenue: 0 });
      adTotals.roas = adTotals.spend > 0 ? Math.round((adTotals.revenue / adTotals.spend) * 100) / 100 : 0;
      adTotals.cpa = adTotals.orders > 0 ? Math.round((adTotals.spend / adTotals.orders) * 100) / 100 : 0;

      const report = {
        client,
        month: ym,
        financials: {
          monthInvoiced: invoices.filter((i) => i.issueDate.startsWith(ym)).reduce((s, i) => s + i.totalDzd, 0),
          monthPaid: db.payments.filter((p) => p.clientId === client.id && p.paymentDate.startsWith(ym)).reduce((s, p) => s + Number(p.amountDzd), 0),
          totalOutstanding: invoices.filter((i) => i.docType === 'FACTURE').reduce((s, i) => s + i.remainingDzd, 0)
        },
        invoices,
        adSpend,
        adTotals,
        deliveredTasks: db.tasks.filter((t) => t.clientId === client.id && t.status === 'DONE'),
        testili: db.testili.filter((t) => t.clientId === client.id).map((t) => ({
          ...t,
          actualRoas: Number(t.amountSpent) > 0 ? Math.round((Number(t.revenue) / Number(t.amountSpent)) * 100) / 100 : 0,
          actualCpa: Number(t.orders) > 0 ? Math.round((Number(t.amountSpent) / Number(t.orders)) * 100) / 100 : 0
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
      return { year: payload.year, archiveUrl: '#', archivedCounts: { Invoices: 1, Expenses: 2, Tasks: 1 }, newOpeningTreasuryBalance: db.settings.openingTreasuryBalance };

    default:
      return {};
  }
}
