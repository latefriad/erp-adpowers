/**
 * ============================================================================
 * ADPOWRS DIGITAL ERP — ONE-CLICK DATABASE & INFRASTRUCTURE SETUP
 * ============================================================================
 * Run `setupAdpowrsERP()` ONCE from the Google Apps Script editor.
 * It creates:
 *  1. All 16 structured tabs (headers + formatting + frozen header row)
 *  2. Default Settings & Document Counters (FAC-2026, DEV-2026)
 *  3. Default Admin user (admin@adpowrs.com / Admin@2026)
 *  4. Default Agency Project Templates (SOPs) & Sample Services
 *  5. Private Google Drive folders (/Adpowrs_ERP/Receipts, /Branding, /Backups)
 *  6. Automated Time-Driven Triggers (06:00 Recurring, 09:00 Reminders, Fri 02:00 Backup)
 */

const SHEET_SCHEMAS = {
  Settings: ['key', 'value', 'updatedAt'],
  Users: ['id', 'name', 'email', 'passwordHash', 'salt', 'role', 'phone', 'active', 'createdAt', 'updatedAt'],
  Leads: [
    'id', 'name', 'company', 'phone', 'email', 'source', 'stage', 'estimatedValue',
    'currency', 'followUpDate', 'assignedTo', 'lostReason', 'notesJson',
    'convertedClientId', 'createdAt', 'updatedAt'
  ],
  Clients: [
    'id', 'name', 'company', 'email', 'phone', 'address', 'taxId',
    'defaultTaxRate', 'tagsJson', 'notesJson', 'portalToken', 'createdAt', 'updatedAt'
  ],
  Services: [
    'id', 'name', 'category', 'description', 'basePrice', 'salePrice',
    'chargesJson', 'totalCharges', 'netProfit', 'currency', 'createdAt', 'updatedAt'
  ],
  Invoices: [
    'id', 'docType', 'number', 'clientId', 'status', 'issueDate', 'dueDate',
    'currency', 'exchangeRate', 'itemsJson', 'subtotal', 'discount',
    'taxTotal', 'total', 'totalDzd', 'depositType', 'depositValue',
    'latePenaltyRate', 'notes', 'convertedFromId', 'publicToken',
    'sentAt', 'viewedAt', 'preReminderAt', 'lastReminderAt', 'createdAt', 'updatedAt'
  ],
  Payments: [
    'id', 'invoiceId', 'clientId', 'amount', 'currency', 'exchangeRate',
    'amountDzd', 'method', 'paymentDate', 'reference', 'status', 'notes', 'createdAt'
  ],
  Recurring: [
    'id', 'clientId', 'title', 'frequency', 'currency', 'exchangeRate',
    'itemsJson', 'discount', 'notes', 'nextRunAt', 'lastRunAt', 'active', 'createdAt', 'updatedAt'
  ],
  Expenses: [
    'id', 'date', 'category', 'description', 'amount', 'currency',
    'exchangeRate', 'amountDzd', 'supplierBillId', 'receiptUrl',
    'receiptFileId', 'notes', 'createdBy', 'createdAt', 'updatedAt'
  ],
  Budgets_Goals: [
    'id', 'year', 'month', 'revenueTarget', 'expenseBudgetsJson', 'updatedAt'
  ],
  Suppliers: [
    'id', 'name', 'category', 'email', 'phone', 'notes', 'createdAt', 'updatedAt'
  ],
  SupplierBills: [
    'id', 'supplierId', 'description', 'category', 'amount', 'currency',
    'exchangeRate', 'amountDzd', 'dueDate', 'status', 'paidAt',
    'expenseId', 'notes', 'createdAt', 'updatedAt'
  ],
  Benefits: [
    'id', 'date', 'type', 'category', 'description', 'amountDzd',
    'notes', 'createdAt', 'updatedAt'
  ],
  AdSpend: [
    'id', 'clientId', 'month', 'platform', 'campaignName', 'clientAdBudget',
    'actualSpend', 'amountBilled', 'orders', 'revenueGenerated',
    'notes', 'createdBy', 'createdAt', 'updatedAt'
  ],
  Testili: [
    'id', 'clientId', 'productName', 'productUrl', 'platform', 'testBudget',
    'amountSpent', 'orders', 'revenue', 'targetCpa', 'targetRoas',
    'status', 'verdict', 'verdictNotes', 'pushedToAdSpend', 'createdBy', 'createdAt', 'updatedAt'
  ],
  Tasks: [
    'id', 'title', 'description', 'clientId', 'assignedTo', 'status',
    'priority', 'taskType', 'startDate', 'dueDate', 'order', 'createdBy', 'createdAt', 'updatedAt'
  ],
  Templates: [
    'id', 'name', 'serviceType', 'description', 'tasksJson', 'createdAt', 'updatedAt'
  ],
  ActivityLog: [
    'id', 'entityType', 'entityId', 'clientId', 'action', 'summary',
    'actorId', 'actorName', 'createdAt'
  ]
};

function setupAdpowrsERP() {
  const ss = getDatabaseSpreadsheet_();
  const now = new Date().toISOString();

  // 1. Create all sheets and headers
  Object.keys(SHEET_SCHEMAS).forEach(function(sheetName) {
    let sheet = ss.getSheetByName(sheetName);
    const headers = SHEET_SCHEMAS[sheetName];
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    const existingFirstRow = sheet.getLastRow() > 0
      ? sheet.getRange(1, 1, 1, headers.length).getValues()[0]
      : [];
    if (existingFirstRow.join('|') !== headers.join('|')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#0f172a')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });

  // Remove default empty "Sheet1" if present
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Feuille 1');
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    ss.deleteSheet(defaultSheet);
  }

  // 2. Create Google Drive folder structure
  const folders = ensureDriveFolders_();

  // 3. Seed default Settings
  const year = new Date().getFullYear();
  const defaultSettings = {
    agencyName: 'Adpowrs Digital',
    tagline: 'Performance Marketing & Digital Growth Agency',
    email: Session.getActiveUser().getEmail() || 'contact@adpowrs.com',
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
    defaultTaxRate: '19',
    eurRate: '245',
    usdRate: '225',
    openingTreasuryBalance: '0',
    remindersEnabled: 'false',
    reminderLeadDays: '3',
    reminderIntervalDays: '5',
    portalBaseUrl: '',
    driveRootFolderId: folders.root.getId(),
    driveReceiptsFolderId: folders.receipts.getId(),
    driveBackupsFolderId: folders.backups.getId(),
    driveBrandingFolderId: folders.branding.getId(),
    ['counter_FACTURE_' + year]: '0',
    ['counter_DEVIS_' + year]: '0',
    lastBackupAt: ''
  };

  const existingSettings = getSettingsMap_();
  Object.keys(defaultSettings).forEach(function(k) {
    if (existingSettings[k] === undefined) {
      setSetting_(k, defaultSettings[k]);
    }
  });

  // 4. Seed initial Admin account if Users sheet is empty
  const users = dbGetAll_('Users');
  if (users.length === 0) {
    const salt = Utilities.getUuid();
    const passwordHash = hashPassword_('Admin@2026', salt);
    dbInsert_('Users', {
      id: generateId_('usr'),
      name: 'Admin Adpowrs',
      email: 'admin@adpowrs.com',
      passwordHash: passwordHash,
      salt: salt,
      role: 'ADMIN',
      phone: '+213550000000',
      active: true,
      createdAt: now,
      updatedAt: now
    });
  }

  // 5. Seed Default Project Templates (SOPs) if empty
  if (dbGetAll_('Templates').length === 0) {
    seedDefaultTemplatesInternal_();
  }

  // 6. Seed Starter Services if empty
  if (dbGetAll_('Services').length === 0) {
    const starterServices = [
      { name: 'Gestion Meta Ads (Mensuel)', category: 'ADS', basePrice: 20000, salePrice: 60000, charges: [{ label: 'Créas & Setup', amount: 15000 }] },
      { name: 'Pack E-Commerce Testili (5 Produits)', category: 'TESTILI', basePrice: 15000, salePrice: 45000, charges: [{ label: 'Montage Vidéo', amount: 10000 }] },
      { name: 'Création Site E-Commerce / Landing Page', category: 'WEBSITE', basePrice: 30000, salePrice: 95000, charges: [{ label: 'Domaine & Hosting', amount: 8000 }] },
      { name: 'Pack Montage Vidéo Ads (10 Reels/TikTok)', category: 'VIDEO', basePrice: 12000, salePrice: 40000, charges: [{ label: 'Voice-Off', amount: 6000 }] }
    ];
    starterServices.forEach(function(s) {
      const totalCharges = s.charges.reduce(function(sum, c) { return sum + Number(c.amount || 0); }, 0);
      dbInsert_('Services', {
        id: generateId_('srv'),
        name: s.name,
        category: s.category,
        description: '',
        basePrice: s.basePrice,
        salePrice: s.salePrice,
        chargesJson: JSON.stringify(s.charges),
        totalCharges: totalCharges,
        netProfit: s.salePrice - totalCharges,
        currency: 'DZD',
        createdAt: now,
        updatedAt: now
      });
    });
  }

  // 7. Install automated time-driven triggers
  installAdpowrsTriggers();

  clearAllCache_();
  Logger.log('✅ Adpowrs Digital ERP setup complete! Admin: admin@adpowrs.com / Admin@2026');
  return {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    folders: {
      root: folders.root.getUrl(),
      receipts: folders.receipts.getUrl(),
      backups: folders.backups.getUrl()
    },
    defaultAdmin: 'admin@adpowrs.com / Admin@2026'
  };
}
