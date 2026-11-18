/**
 * ============================================================================
 * ADPOWRS DIGITAL ERP — CRM, CLIENTS 360°, MEDIA BUYING, TESTILI, TASKS, PORTAL
 * ============================================================================
 */

/* =========================== LEADS CRM ==================================== */

function handleListLeads_(user) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']);
  const leads = dbGetAll_('Leads').map(function(l) {
    return Object.assign({}, l, { notes: safeJsonParse_(l.notesJson, []) });
  }).sort(function(a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
  return { leads: leads };
}

function handleSaveLead_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']);
  const now = new Date().toISOString();
  if (payload.id) {
    const existing = dbGetById_('Leads', payload.id);
    if (!existing) throw new Error('Lead not found');
    const notes = payload.newNote
      ? safeJsonParse_(existing.notesJson, []).concat([{ text: payload.newNote, author: user.name, createdAt: now }])
      : (payload.notes ? payload.notes : safeJsonParse_(existing.notesJson, []));

    const updated = dbUpdate_('Leads', payload.id, {
      name: payload.name !== undefined ? String(payload.name) : existing.name,
      company: payload.company !== undefined ? String(payload.company) : existing.company,
      phone: payload.phone !== undefined ? String(payload.phone) : existing.phone,
      email: payload.email !== undefined ? String(payload.email) : existing.email,
      source: payload.source || existing.source,
      stage: payload.stage || existing.stage,
      estimatedValue: payload.estimatedValue !== undefined ? toNum_(payload.estimatedValue) : existing.estimatedValue,
      currency: payload.currency || existing.currency || 'DZD',
      followUpDate: payload.followUpDate !== undefined ? String(payload.followUpDate) : existing.followUpDate,
      assignedTo: payload.assignedTo !== undefined ? String(payload.assignedTo) : existing.assignedTo,
      lostReason: payload.lostReason !== undefined ? String(payload.lostReason) : existing.lostReason,
      notesJson: JSON.stringify(notes),
      updatedAt: now
    });
    return { lead: Object.assign({}, updated, { notes: notes }) };
  }

  const notes = payload.note ? [{ text: payload.note, author: user.name, createdAt: now }] : [];
  const record = {
    id: generateId_('lead'),
    name: String(payload.name || ''),
    company: String(payload.company || ''),
    phone: String(payload.phone || ''),
    email: String(payload.email || ''),
    source: String(payload.source || 'WHATSAPP'),
    stage: String(payload.stage || 'NEW'),
    estimatedValue: toNum_(payload.estimatedValue || 0),
    currency: String(payload.currency || 'DZD'),
    followUpDate: String(payload.followUpDate || ''),
    assignedTo: String(payload.assignedTo || user.id),
    lostReason: '',
    notesJson: JSON.stringify(notes),
    convertedClientId: '',
    createdAt: now,
    updatedAt: now
  };
  dbInsert_('Leads', record);
  return { lead: Object.assign({}, record, { notes: notes }) };
}

function handleConvertLeadToClient_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']);
  const lead = dbGetById_('Leads', payload.id);
  if (!lead) throw new Error('Lead not found');
  if (lead.convertedClientId) {
    return { client: dbGetById_('Clients', lead.convertedClientId), alreadyConverted: true };
  }
  const clientRes = handleSaveClient_(user, {
    name: lead.name,
    company: lead.company || lead.name,
    email: lead.email,
    phone: lead.phone,
    tags: [lead.source || 'LEAD']
  });
  dbUpdate_('Leads', lead.id, {
    stage: 'WON',
    convertedClientId: clientRes.client.id,
    updatedAt: new Date().toISOString()
  });
  return { client: clientRes.client };
}

/* =========================== CLIENTS 360° ================================= */

function handleListClients_(user) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER', 'TEAM']);
  const clients = dbGetAll_('Clients').map(function(c) {
    return Object.assign({}, c, {
      tags: safeJsonParse_(c.tagsJson, []),
      notes: safeJsonParse_(c.notesJson, [])
    });
  }).sort(function(a, b) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
  if (user.role === 'TEAM') {
    return {
      clients: clients.map(function(c) {
        return { id: c.id, name: c.name, company: c.company };
      })
    };
  }
  return { clients: clients };
}

function handleSaveClient_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']);
  const now = new Date().toISOString();
  const settings = getSettingsMap_();

  if (payload.id) {
    const existing = dbGetById_('Clients', payload.id);
    if (!existing) throw new Error('Client not found');
    let notes = safeJsonParse_(existing.notesJson, []);
    if (payload.newNote) {
      notes = notes.concat([{ id: generateId_('nt'), text: payload.newNote, author: user.name, createdAt: now }]);
      logActivity_('CLIENT', existing.id, existing.id, 'NOTE_ADDED', 'Note added on client profile', user);
    } else if (Array.isArray(payload.notes)) {
      notes = payload.notes;
    }

    const updated = dbUpdate_('Clients', payload.id, {
      name: payload.name !== undefined ? String(payload.name) : existing.name,
      company: payload.company !== undefined ? String(payload.company) : existing.company,
      email: payload.email !== undefined ? String(payload.email) : existing.email,
      phone: payload.phone !== undefined ? String(payload.phone) : existing.phone,
      address: payload.address !== undefined ? String(payload.address) : existing.address,
      taxId: payload.taxId !== undefined ? String(payload.taxId) : existing.taxId,
      defaultTaxRate: payload.defaultTaxRate !== undefined ? toNum_(payload.defaultTaxRate) : existing.defaultTaxRate,
      tagsJson: payload.tags !== undefined ? JSON.stringify(payload.tags) : existing.tagsJson,
      notesJson: JSON.stringify(notes),
      updatedAt: now
    });
    return {
      client: Object.assign({}, updated, {
        tags: safeJsonParse_(updated.tagsJson, []),
        notes: notes
      })
    };
  }

  const record = {
    id: generateId_('cli'),
    name: String(payload.name || ''),
    company: String(payload.company || ''),
    email: String(payload.email || ''),
    phone: String(payload.phone || ''),
    address: String(payload.address || ''),
    taxId: String(payload.taxId || ''),
    defaultTaxRate: payload.defaultTaxRate !== undefined ? toNum_(payload.defaultTaxRate) : toNum_(settings.defaultTaxRate || 19),
    tagsJson: JSON.stringify(payload.tags || []),
    notesJson: JSON.stringify([]),
    portalToken: generateToken_(),
    createdAt: now,
    updatedAt: now
  };
  dbInsert_('Clients', record);
  logActivity_('CLIENT', record.id, record.id, 'CLIENT_CREATED', 'Client ' + (record.company || record.name) + ' created', user);
  return { client: Object.assign({}, record, { tags: payload.tags || [], notes: [] }) };
}

function handleGetClientDetail_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']);
  const client = dbGetById_('Clients', payload.id);
  if (!client) throw new Error('Client not found');

  const canSeeFinance = user.role === 'ADMIN' || user.role === 'ACCOUNTANT';
  const payments = canSeeFinance ? dbGetAll_('Payments').filter(function(p) { return p.clientId === client.id && p.status !== 'REJECTED'; }) : [];
  const paysByInv = {};
  payments.forEach(function(p) {
    if (!paysByInv[p.invoiceId]) paysByInv[p.invoiceId] = [];
    paysByInv[p.invoiceId].push(p);
  });

  const invoices = canSeeFinance
    ? dbGetAll_('Invoices')
        .filter(function(i) { return i.clientId === client.id; })
        .map(function(i) { return enrichInvoice_(i, paysByInv, { [client.id]: client }); })
    : [];

  let totalInvoiced = 0, totalPaid = 0, totalRemaining = 0, totalOverdue = 0;
  invoices.forEach(function(i) {
    if (i.docType === 'FACTURE' && i.status !== 'DRAFT' && i.status !== 'ANNULEE') {
      totalInvoiced += toNum_(i.totalDzd);
      totalPaid += toNum_(i.paidDzd);
      totalRemaining += toNum_(i.remainingDzd);
      if (i.isOverdue) totalOverdue += toNum_(i.remainingDzd);
    }
  });

  const tasks = dbGetAll_('Tasks').filter(function(t) { return t.clientId === client.id; });
  const timeline = dbGetAll_('ActivityLog')
    .filter(function(a) { return a.clientId === client.id; })
    .sort(function(a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });

  return {
    client: Object.assign({}, client, {
      tags: safeJsonParse_(client.tagsJson, []),
      notes: safeJsonParse_(client.notesJson, [])
    }),
    financials: canSeeFinance ? {
      totalInvoiced: round2_(totalInvoiced),
      totalPaid: round2_(totalPaid),
      totalRemaining: round2_(totalRemaining),
      totalOverdue: round2_(totalOverdue)
    } : null,
    invoices: invoices,
    tasks: tasks,
    timeline: timeline
  };
}

/* =========================== SERVICES CATALOG ============================= */

function handleListServices_(user) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']);
  return {
    services: dbGetAll_('Services').map(function(s) {
      return Object.assign({}, s, { charges: safeJsonParse_(s.chargesJson, []) });
    })
  };
}

function handleSaveService_(user, payload) {
  requireRole_(user, ['ADMIN']);
  const now = new Date().toISOString();
  const charges = Array.isArray(payload.charges) ? payload.charges : [];
  const totalCharges = round2_(charges.reduce(function(s, c) { return s + toNum_(c.amount); }, 0));
  const salePrice = round2_(toNum_(payload.salePrice));
  const data = {
    name: String(payload.name || ''),
    category: String(payload.category || 'ADS'),
    description: String(payload.description || ''),
    basePrice: round2_(toNum_(payload.basePrice)),
    salePrice: salePrice,
    chargesJson: JSON.stringify(charges),
    totalCharges: totalCharges,
    netProfit: round2_(salePrice - totalCharges),
    currency: String(payload.currency || 'DZD'),
    updatedAt: now
  };
  if (payload.id) {
    return { service: Object.assign({}, dbUpdate_('Services', payload.id, data), { charges: charges }) };
  }
  const rec = Object.assign({ id: generateId_('srv'), createdAt: now }, data);
  dbInsert_('Services', rec);
  return { service: Object.assign({}, rec, { charges: charges }) };
}

/* =========================== AD SPEND & TESTILI =========================== */

function handleListAdSpend_(user) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']);
  const clients = dbGetAll_('Clients');
  const clientMap = {};
  clients.forEach(function(c) { clientMap[c.id] = c; });

  const rows = dbGetAll_('AdSpend').map(function(r) {
    const spend = toNum_(r.actualSpend);
    const billed = toNum_(r.amountBilled);
    const orders = toNum_(r.orders);
    const rev = toNum_(r.revenueGenerated);
    return Object.assign({}, r, {
      clientName: clientMap[r.clientId] ? (clientMap[r.clientId].company || clientMap[r.clientId].name) : '',
      agencyMargin: round2_(billed - spend),
      roas: spend > 0 ? round2_(rev / spend) : 0,
      cpa: orders > 0 ? round2_(spend / orders) : 0
    });
  }).sort(function(a, b) { return String(b.month).localeCompare(String(a.month)); });

  return { adSpend: rows };
}

function handleSaveAdSpend_(user, payload) {
  requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
  const now = new Date().toISOString();
  const data = {
    clientId: String(payload.clientId || ''),
    month: String(payload.month || now.slice(0, 7)),
    platform: String(payload.platform || 'META'),
    campaignName: String(payload.campaignName || ''),
    clientAdBudget: round2_(toNum_(payload.clientAdBudget)),
    actualSpend: round2_(toNum_(payload.actualSpend)),
    amountBilled: round2_(toNum_(payload.amountBilled)),
    orders: Math.round(toNum_(payload.orders)),
    revenueGenerated: round2_(toNum_(payload.revenueGenerated)),
    notes: String(payload.notes || ''),
    updatedAt: now
  };
  if (payload.id) {
    return { record: dbUpdate_('AdSpend', payload.id, data) };
  }
  const rec = Object.assign({ id: generateId_('ads'), createdBy: user.id, createdAt: now }, data);
  dbInsert_('AdSpend', rec);
  return { record: rec };
}

function handleListTestili_(user) {
  requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
  const clients = dbGetAll_('Clients');
  const clientMap = {};
  clients.forEach(function(c) { clientMap[c.id] = c; });

  const items = dbGetAll_('Testili').map(function(t) {
    const spent = toNum_(t.amountSpent);
    const orders = toNum_(t.orders);
    const rev = toNum_(t.revenue);
    return Object.assign({}, t, {
      clientName: clientMap[t.clientId] ? (clientMap[t.clientId].company || clientMap[t.clientId].name) : '',
      actualCpa: orders > 0 ? round2_(spent / orders) : 0,
      actualRoas: spent > 0 ? round2_(rev / spent) : 0,
      pushedToAdSpend: t.pushedToAdSpend === true || String(t.pushedToAdSpend).toLowerCase() === 'true'
    });
  }).sort(function(a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });

  return { tests: items };
}

function handleSaveTestili_(user, payload) {
  requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
  const now = new Date().toISOString();
  const data = {
    clientId: String(payload.clientId || ''),
    productName: String(payload.productName || ''),
    productUrl: String(payload.productUrl || ''),
    platform: String(payload.platform || 'META'),
    testBudget: round2_(toNum_(payload.testBudget)),
    amountSpent: round2_(toNum_(payload.amountSpent)),
    orders: Math.round(toNum_(payload.orders)),
    revenue: round2_(toNum_(payload.revenue)),
    targetCpa: round2_(toNum_(payload.targetCpa)),
    targetRoas: round2_(toNum_(payload.targetRoas)),
    status: String(payload.status || 'PLANNED'),
    verdict: String(payload.verdict || 'PENDING'),
    verdictNotes: String(payload.verdictNotes || ''),
    updatedAt: now
  };
  if (payload.id) {
    return { test: dbUpdate_('Testili', payload.id, data) };
  }
  const rec = Object.assign({
    id: generateId_('tst'),
    pushedToAdSpend: false,
    createdBy: user.id,
    createdAt: now
  }, data);
  dbInsert_('Testili', rec);
  return { test: rec };
}

function handlePushTestiliToAdSpend_(user, payload) {
  requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
  const test = dbGetById_('Testili', payload.id);
  if (!test) throw new Error('Testili record not found');

  const adRes = handleSaveAdSpend_(user, {
    clientId: test.clientId,
    month: payload.month || new Date().toISOString().slice(0, 7),
    platform: test.platform || 'META',
    campaignName: '[Testili] ' + test.productName,
    clientAdBudget: toNum_(test.testBudget),
    actualSpend: toNum_(test.amountSpent),
    amountBilled: payload.amountBilled !== undefined ? toNum_(payload.amountBilled) : toNum_(test.amountSpent),
    orders: toNum_(test.orders),
    revenueGenerated: toNum_(test.revenue),
    notes: 'Pushed from Testili (' + test.verdict + ')'
  });

  dbUpdate_('Testili', test.id, { pushedToAdSpend: true, updatedAt: new Date().toISOString() });
  return { adSpend: adRes.record };
}

/* =========================== TASKS & TEMPLATES ============================ */

function handleListTasks_(user) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER', 'TEAM']);
  const clients = dbGetAll_('Clients');
  const users = dbGetAll_('Users');
  const clientMap = {};
  clients.forEach(function(c) { clientMap[c.id] = c; });
  const userMap = {};
  users.forEach(function(u) { userMap[u.id] = u; });

  let tasks = dbGetAll_('Tasks');
  if (user.role === 'TEAM') {
    tasks = tasks.filter(function(t) { return String(t.assignedTo) === String(user.id); });
  }

  return {
    tasks: tasks.map(function(t) {
      return Object.assign({}, t, {
        order: toNum_(t.order),
        clientName: clientMap[t.clientId] ? (clientMap[t.clientId].company || clientMap[t.clientId].name) : '',
        assigneeName: userMap[t.assignedTo] ? userMap[t.assignedTo].name : ''
      });
    }).sort(function(a, b) { return a.order - b.order; })
  };
}

function handleSaveTask_(user, payload) {
  requireRole_(user, ['ADMIN', 'MEDIA_BUYER', 'TEAM']);
  const now = new Date().toISOString();

  if (payload.id) {
    const existing = dbGetById_('Tasks', payload.id);
    if (!existing) throw new Error('Task not found');

    // TEAM role can ONLY move status & order of their OWN tasks
    if (user.role === 'TEAM') {
      if (String(existing.assignedTo) !== String(user.id)) {
        throw new Error('FORBIDDEN: You can only update your own assigned tasks');
      }
      return {
        task: dbUpdate_('Tasks', payload.id, {
          status: payload.status || existing.status,
          order: payload.order !== undefined ? toNum_(payload.order) : existing.order,
          updatedAt: now
        })
      };
    }

    return {
      task: dbUpdate_('Tasks', payload.id, {
        title: payload.title !== undefined ? String(payload.title) : existing.title,
        description: payload.description !== undefined ? String(payload.description) : existing.description,
        clientId: payload.clientId !== undefined ? String(payload.clientId) : existing.clientId,
        assignedTo: payload.assignedTo !== undefined ? String(payload.assignedTo) : existing.assignedTo,
        status: payload.status || existing.status,
        priority: payload.priority || existing.priority,
        taskType: payload.taskType || existing.taskType,
        startDate: payload.startDate !== undefined ? String(payload.startDate) : existing.startDate,
        dueDate: payload.dueDate !== undefined ? String(payload.dueDate) : existing.dueDate,
        order: payload.order !== undefined ? toNum_(payload.order) : existing.order,
        updatedAt: now
      })
    };
  }

  requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
  const rec = {
    id: generateId_('tsk'),
    title: String(payload.title || ''),
    description: String(payload.description || ''),
    clientId: String(payload.clientId || ''),
    assignedTo: String(payload.assignedTo || ''),
    status: String(payload.status || 'TODO'),
    priority: String(payload.priority || 'MEDIUM'),
    taskType: String(payload.taskType || 'PROJECT'),
    startDate: String(payload.startDate || now.slice(0, 10)),
    dueDate: String(payload.dueDate || ''),
    order: toNum_(payload.order || 0),
    createdBy: user.id,
    createdAt: now,
    updatedAt: now
  };
  dbInsert_('Tasks', rec);
  if (rec.clientId) {
    logActivity_('TASK', rec.id, rec.clientId, 'TASK_CREATED', 'Task "' + rec.title + '" created', user);
  }
  return { task: rec };
}

function seedDefaultTemplatesInternal_() {
  const now = new Date().toISOString();
  const defaults = [
    {
      name: 'Onboarding Meta Ads E-Commerce',
      serviceType: 'META_ADS',
      description: 'Workflow complet de lancement Meta Ads pour client e-commerce',
      tasks: [
        { title: 'Audit Business Manager, Pixel & CAPI', priority: 'HIGH', dayOffset: 1, defaultRole: 'MEDIA_BUYER' },
        { title: 'Brief créatif & scripts UGC / Hooks', priority: 'HIGH', dayOffset: 2, defaultRole: 'TEAM' },
        { title: 'Montage 5 créatives vidéos + variations', priority: 'MEDIUM', dayOffset: 4, defaultRole: 'TEAM' },
        { title: 'Lancement campagne Testing ABO', priority: 'HIGH', dayOffset: 5, defaultRole: 'MEDIA_BUYER' },
        { title: 'Analyse KPIs J+3 & optimisation', priority: 'MEDIUM', dayOffset: 8, defaultRole: 'MEDIA_BUYER' }
      ]
    },
    {
      name: 'Sprint Testili (Validation Produit)',
      serviceType: 'TESTILI',
      description: 'Validation rapide de 3 produits gagnants sur Meta/TikTok',
      tasks: [
        { title: 'Sélection & validation 3 produits + offre', priority: 'HIGH', dayOffset: 1, defaultRole: 'MEDIA_BUYER' },
        { title: 'Création Landing Pages COD', priority: 'HIGH', dayOffset: 2, defaultRole: 'TEAM' },
        { title: 'Montage vidéos courtes TikTok / Reels', priority: 'MEDIUM', dayOffset: 3, defaultRole: 'TEAM' },
        { title: 'Lancement tests & verdict Winner/Loser', priority: 'HIGH', dayOffset: 6, defaultRole: 'MEDIA_BUYER' }
      ]
    },
    {
      name: 'Création Site Web / Landing Page',
      serviceType: 'WEBSITE',
      description: 'De la maquette jusqu\'à la mise en ligne',
      tasks: [
        { title: 'Collecte branding, textes & accès domaine', priority: 'HIGH', dayOffset: 1, defaultRole: 'ADMIN' },
        { title: 'Maquette UI/UX Desktop & Mobile', priority: 'HIGH', dayOffset: 3, defaultRole: 'TEAM' },
        { title: 'Développement & intégration Pixel / Analytics', priority: 'HIGH', dayOffset: 7, defaultRole: 'TEAM' },
        { title: 'Recette QA & mise en production', priority: 'MEDIUM', dayOffset: 9, defaultRole: 'ADMIN' }
      ]
    },
    {
      name: 'Pack Production Vidéo & Contenu',
      serviceType: 'VIDEO_EDITING',
      description: 'Calendrier mensuel Reels, TikTok & Ads',
      tasks: [
        { title: 'Planification scripts & angles marketing', priority: 'MEDIUM', dayOffset: 1, defaultRole: 'MEDIA_BUYER' },
        { title: 'Tournage / Voice-Off', priority: 'MEDIUM', dayOffset: 3, defaultRole: 'TEAM' },
        { title: 'Montage dynamique + sous-titres', priority: 'HIGH', dayOffset: 6, defaultRole: 'TEAM' },
        { title: 'Validation client & livraison Drive', priority: 'LOW', dayOffset: 8, defaultRole: 'ADMIN' }
      ]
    }
  ];
  defaults.forEach(function(tpl) {
    dbInsert_('Templates', {
      id: generateId_('tpl'),
      name: tpl.name,
      serviceType: tpl.serviceType,
      description: tpl.description,
      tasksJson: JSON.stringify(tpl.tasks),
      createdAt: now,
      updatedAt: now
    });
  });
}

function handleListTemplates_(user) {
  requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
  return {
    templates: dbGetAll_('Templates').map(function(t) {
      return Object.assign({}, t, { tasks: safeJsonParse_(t.tasksJson, []) });
    })
  };
}

function handleSaveTemplate_(user, payload) {
  requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
  const now = new Date().toISOString();
  const data = {
    name: String(payload.name || ''),
    serviceType: String(payload.serviceType || 'META_ADS'),
    description: String(payload.description || ''),
    tasksJson: JSON.stringify(payload.tasks || []),
    updatedAt: now
  };
  if (payload.id) {
    return { template: Object.assign({}, dbUpdate_('Templates', payload.id, data), { tasks: payload.tasks || [] }) };
  }
  const rec = Object.assign({ id: generateId_('tpl'), createdAt: now }, data);
  dbInsert_('Templates', rec);
  return { template: Object.assign({}, rec, { tasks: payload.tasks || [] }) };
}

function handleApplyTemplate_(user, payload) {
  requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
  const tpl = dbGetById_('Templates', payload.templateId);
  if (!tpl) throw new Error('Template not found');
  const tasks = safeJsonParse_(tpl.tasksJson, []);
  const startMs = new Date((payload.startDate || new Date().toISOString().slice(0, 10)) + 'T00:00:00Z').getTime();

  const users = dbGetAll_('Users').filter(function(u) {
    return u.active === true || String(u.active).toLowerCase() === 'true';
  });

  const created = tasks.map(function(item, idx) {
    const dueMs = startMs + toNum_(item.dayOffset || (idx + 1)) * 86400000;
    const dueDate = new Date(dueMs).toISOString().slice(0, 10);
    const matchedUser = users.find(function(u) { return u.role === item.defaultRole; });
    return handleSaveTask_(user, {
      title: item.title,
      description: item.description || ('Généré depuis: ' + tpl.name),
      clientId: payload.clientId || '',
      assignedTo: matchedUser ? matchedUser.id : '',
      status: 'TODO',
      priority: item.priority || 'MEDIUM',
      taskType: 'PROJECT',
      startDate: new Date(startMs).toISOString().slice(0, 10),
      dueDate: dueDate,
      order: idx
    }).task;
  });

  return { createdCount: created.length, tasks: created };
}

/* ==================== CLIENT MONTHLY REPORTS & PUBLIC PORTAL ============== */

function buildClientMonthlyReport_(client, month, includeFinancials) {
  const ym = month || new Date().toISOString().slice(0, 7);

  let financials = null;
  let invoices = [];
  if (includeFinancials) {
    const payments = dbGetAll_('Payments').filter(function(p) { return p.clientId === client.id && p.status !== 'REJECTED'; });
    const paysByInv = {};
    payments.forEach(function(p) {
      if (!paysByInv[p.invoiceId]) paysByInv[p.invoiceId] = [];
      paysByInv[p.invoiceId].push(p);
    });
    const allClientInvoices = dbGetAll_('Invoices')
      .filter(function(i) { return i.clientId === client.id && i.status !== 'DRAFT' && i.status !== 'ANNULEE'; })
      .map(function(i) { return enrichInvoice_(i, paysByInv, { [client.id]: client }); });

    const monthInvoices = allClientInvoices.filter(function(i) { return String(i.issueDate).slice(0, 7) === ym; });
    const monthPaid = payments.filter(function(p) { return String(p.paymentDate || p.createdAt).slice(0, 7) === ym; })
      .reduce(function(s, p) { return s + toNum_(p.amountDzd); }, 0);
    const totalOutstanding = allClientInvoices.filter(function(i) { return i.docType === 'FACTURE'; })
      .reduce(function(s, i) { return s + toNum_(i.remainingDzd); }, 0);

    financials = {
      monthInvoiced: round2_(monthInvoices.reduce(function(s, i) { return s + toNum_(i.totalDzd); }, 0)),
      monthPaid: round2_(monthPaid),
      totalOutstanding: round2_(totalOutstanding),
      monthInvoicesCount: monthInvoices.length
    };
    invoices = allClientInvoices.slice(0, 15);
  }

  const adSpendRows = dbGetAll_('AdSpend').filter(function(a) {
    return a.clientId === client.id && String(a.month).slice(0, 7) === ym;
  }).map(function(r) {
    const spend = toNum_(r.actualSpend);
    const orders = toNum_(r.orders);
    const rev = toNum_(r.revenueGenerated);
    return Object.assign({}, r, {
      roas: spend > 0 ? round2_(rev / spend) : 0,
      cpa: orders > 0 ? round2_(spend / orders) : 0,
      agencyMargin: round2_(toNum_(r.amountBilled) - spend)
    });
  });

  const adTotals = adSpendRows.reduce(function(acc, r) {
    acc.budget += toNum_(r.clientAdBudget);
    acc.spend += toNum_(r.actualSpend);
    acc.billed += toNum_(r.amountBilled);
    acc.orders += toNum_(r.orders);
    acc.revenue += toNum_(r.revenueGenerated);
    return acc;
  }, { budget: 0, spend: 0, billed: 0, orders: 0, revenue: 0 });
  adTotals.roas = adTotals.spend > 0 ? round2_(adTotals.revenue / adTotals.spend) : 0;
  adTotals.cpa = adTotals.orders > 0 ? round2_(adTotals.spend / adTotals.orders) : 0;

  const doneTasks = dbGetAll_('Tasks').filter(function(t) {
    return t.clientId === client.id && t.status === 'DONE' &&
      (String(t.updatedAt || t.dueDate).slice(0, 7) === ym);
  });

  const testili = dbGetAll_('Testili').filter(function(t) {
    return t.clientId === client.id && String(t.createdAt).slice(0, 7) === ym;
  }).map(function(t) {
    const s = toNum_(t.amountSpent);
    const o = toNum_(t.orders);
    const r = toNum_(t.revenue);
    return Object.assign({}, t, {
      actualRoas: s > 0 ? round2_(r / s) : 0,
      actualCpa: o > 0 ? round2_(s / o) : 0
    });
  });

  return {
    client: {
      id: client.id,
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      portalToken: client.portalToken
    },
    month: ym,
    financials: financials,
    invoices: invoices,
    adSpend: adSpendRows,
    adTotals: adTotals,
    deliveredTasks: doneTasks,
    testili: testili
  };
}

function handleGetClientReport_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']);
  const client = dbGetById_('Clients', payload.clientId);
  if (!client) throw new Error('Client not found');
  return buildClientMonthlyReport_(client, payload.month, true);
}

/**
 * Unauthenticated Public Client Portal (/portal/:token)
 * Accepts EITHER a Client's portalToken OR an individual Invoice's publicToken.
 * Automatically marks opened invoices as Viewed!
 */
function handlePublicPortal_(payload) {
  const token = String(payload.token || '').trim();
  if (!token) throw new Error('Token is required');

  const settings = getPublicSettings_();
  const clients = dbGetAll_('Clients');
  let client = clients.find(function(c) { return c.portalToken === token; });
  let focusedInvoiceId = null;

  if (!client) {
    const invoices = dbGetAll_('Invoices');
    const matchedInv = invoices.find(function(i) { return i.publicToken === token; });
    if (!matchedInv) throw new Error('Invalid or expired portal link');
    focusedInvoiceId = matchedInv.id;
    if (!matchedInv.viewedAt) {
      dbUpdate_('Invoices', matchedInv.id, { viewedAt: new Date().toISOString() });
    }
    client = clients.find(function(c) { return c.id === matchedInv.clientId; });
  } else {
    // Stamp viewedAt on latest sent invoice when client visits portal
    const now = new Date().toISOString();
    dbGetAll_('Invoices').forEach(function(inv) {
      if (inv.clientId === client.id && !inv.viewedAt && inv.status !== 'DRAFT' && inv.status !== 'ANNULEE') {
        dbUpdate_('Invoices', inv.id, { viewedAt: now });
      }
    });
  }

  if (!client) throw new Error('Client record not found');
  const report = buildClientMonthlyReport_(client, payload.month, true);

  // Strip internal agencyMargin from public client portal
  report.adSpend = report.adSpend.map(function(a) {
    const clone = Object.assign({}, a);
    delete clone.agencyMargin;
    return clone;
  });

  return {
    agency: settings,
    focusedInvoiceId: focusedInvoiceId,
    report: report
  };
}

function handleGlobalSearch_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER']);
  const q = String(payload.q || '').trim().toLowerCase();
  if (q.length < 2) return { clients: [], invoices: [], leads: [], tasks: [] };

  const clients = dbGetAll_('Clients').filter(function(c) {
    return (c.name + ' ' + c.company + ' ' + c.email + ' ' + c.phone).toLowerCase().indexOf(q) !== -1;
  }).slice(0, 6);

  const invoices = (user.role === 'ADMIN' || user.role === 'ACCOUNTANT')
    ? dbGetAll_('Invoices').filter(function(i) {
        return (i.number + ' ' + i.notes + ' ' + i.status).toLowerCase().indexOf(q) !== -1;
      }).slice(0, 6)
    : [];

  const leads = dbGetAll_('Leads').filter(function(l) {
    return (l.name + ' ' + l.company + ' ' + l.phone).toLowerCase().indexOf(q) !== -1;
  }).slice(0, 5);

  const tasks = dbGetAll_('Tasks').filter(function(t) {
    return (t.title + ' ' + t.description).toLowerCase().indexOf(q) !== -1;
  }).slice(0, 5);

  return { clients: clients, invoices: invoices, leads: leads, tasks: tasks };
}
