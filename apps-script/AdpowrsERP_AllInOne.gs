// ============================================================================
// ADPOWRS DIGITAL ERP — ALL-IN-ONE GOOGLE APPS SCRIPT (PASTE INTO Code.gs)
// Pre-linked to Spreadsheet ID: 1XQRrR2CduOu1SS1CLW38Wncc7Ie3VB2KxE726P17ggo
// ============================================================================

const DEFAULT_SPREADSHEET_ID = "1XQRrR2CduOu1SS1CLW38Wncc7Ie3VB2KxE726P17ggo";



// -------------------- Setup.gs --------------------

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


// -------------------- SheetsDB.gs --------------------

/**
 * ============================================================================
 * ADPOWRS DIGITAL ERP — GOOGLE SHEETS DATABASE ENGINE + CACHING
 * ============================================================================
 */

const CACHE_TTL_SECONDS = 300; // 5 minutes script cache

function getDatabaseSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SPREADSHEET_ID');
  if (savedId) {
    return SpreadsheetApp.openById(savedId);
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('SPREADSHEET_ID', active.getId());
    return active;
  }
  throw new Error('SPREADSHEET_ID not configured. Bind script to a Google Sheet or set SPREADSHEET_ID in Script Properties.');
}

function generateId_(prefix) {
  const rand = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  return (prefix ? prefix + '_' : '') + rand;
}

function generateToken_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function getCacheKey_(sheetName) {
  return 'adpowrs_sheet_' + sheetName;
}

function invalidateSheetCache_(sheetName) {
  try {
    CacheService.getScriptCache().remove(getCacheKey_(sheetName));
  } catch (e) {}
}

function clearAllCache_() {
  try {
    const cache = CacheService.getScriptCache();
    const keys = Object.keys(SHEET_SCHEMAS).map(getCacheKey_);
    cache.removeAll(keys);
  } catch (e) {}
}

function parseCellValue_(val) {
  if (val instanceof Date) {
    return val.toISOString();
  }
  return val;
}

function dbGetAll_(sheetName, skipCache) {
  const cache = CacheService.getScriptCache();
  const cacheKey = getCacheKey_(sheetName);

  if (!skipCache) {
    try {
      const cached = cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
  }

  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const headers = SHEET_SCHEMAS[sheetName] || [];
  if (lastRow <= 1 || headers.length === 0) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const rows = [];

  for (let i = 0; i < values.length; i++) {
    const rowArr = values[i];
    if (!rowArr[0] && rowArr[0] !== 0) continue; // skip blank rows
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = parseCellValue_(rowArr[j]);
    }
    rows.push(obj);
  }

  try {
    const serialized = JSON.stringify(rows);
    if (serialized.length < 95000) {
      cache.put(cacheKey, serialized, CACHE_TTL_SECONDS);
    }
  } catch (e) {}

  return rows;
}

function dbGetById_(sheetName, id) {
  const rows = dbGetAll_(sheetName);
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(id)) return rows[i];
  }
  return null;
}

function dbInsert_(sheetName, record) {
  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  const headers = SHEET_SCHEMAS[sheetName];
  const rowArr = headers.map(function(h) {
    const v = record[h];
    if (v === undefined || v === null) return '';
    return v;
  });

  sheet.appendRow(rowArr);
  invalidateSheetCache_(sheetName);
  return record;
}

function dbUpdate_(sheetName, id, patch) {
  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  const headers = SHEET_SCHEMAS[sheetName];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRowIndex = -1;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      targetRowIndex = i + 2;
      break;
    }
  }
  if (targetRowIndex === -1) return null;

  const currentArr = sheet.getRange(targetRowIndex, 1, 1, headers.length).getValues()[0];
  const updated = {};
  const nextArr = headers.map(function(h, idx) {
    const nextVal = Object.prototype.hasOwnProperty.call(patch, h)
      ? (patch[h] === undefined || patch[h] === null ? '' : patch[h])
      : parseCellValue_(currentArr[idx]);
    updated[h] = nextVal;
    return nextVal;
  });

  sheet.getRange(targetRowIndex, 1, 1, headers.length).setValues([nextArr]);
  invalidateSheetCache_(sheetName);
  return updated;
}

function dbDelete_(sheetName, id) {
  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      invalidateSheetCache_(sheetName);
      return true;
    }
  }
  return false;
}

function getSettingsMap_() {
  const rows = dbGetAll_('Settings');
  const map = {};
  rows.forEach(function(r) {
    if (r.key) map[r.key] = String(r.value !== undefined && r.value !== null ? r.value : '');
  });
  return map;
}

function setSetting_(key, value) {
  const ss = getDatabaseSpreadsheet_();
  const sheet = ss.getSheetByName('Settings');
  const now = new Date().toISOString();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === String(key)) {
        sheet.getRange(i + 2, 2, 1, 2).setValues([[String(value), now]]);
        invalidateSheetCache_('Settings');
        return;
      }
    }
  }
  sheet.appendRow([String(key), String(value), now]);
  invalidateSheetCache_('Settings');
}

function safeJsonParse_(str, fallback) {
  if (!str) return fallback;
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

function logActivity_(entityType, entityId, clientId, action, summary, user) {
  try {
    dbInsert_('ActivityLog', {
      id: generateId_('act'),
      entityType: entityType || '',
      entityId: entityId || '',
      clientId: clientId || '',
      action: action || '',
      summary: summary || '',
      actorId: user ? user.id : 'system',
      actorName: user ? user.name : 'System',
      createdAt: new Date().toISOString()
    });
  } catch (e) {}
}

function toNum_(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function round2_(n) {
  return Math.round((toNum_(n) + Number.EPSILON) * 100) / 100;
}


// -------------------- Auth.gs --------------------

/**
 * ============================================================================
 * ADPOWRS DIGITAL ERP — AUTHENTICATION & 4-ROLE RBAC
 * Roles: ADMIN | ACCOUNTANT | MEDIA_BUYER | TEAM
 * ============================================================================
 */

const VALID_ROLES = ['ADMIN', 'ACCOUNTANT', 'MEDIA_BUYER', 'TEAM'];
const SESSION_TTL_HOURS = 24 * 7; // 7 days

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + '::adpowrs::' + password,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function sanitizeUser_(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone || '',
    active: u.active === true || String(u.active).toLowerCase() === 'true',
    createdAt: u.createdAt
  };
}

function createSession_(user) {
  const token = generateToken_();
  const payload = {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    expiresAt: Date.now() + SESSION_TTL_HOURS * 3600 * 1000
  };
  const json = JSON.stringify(payload);
  // Store in ScriptProperties (persistent) + CacheService (fast)
  PropertiesService.getScriptProperties().setProperty('sess_' + token, json);
  CacheService.getScriptCache().put('sess_' + token, json, 21600);
  return token;
}

function verifySession_(token) {
  if (!token) return null;
  const key = 'sess_' + token;
  let raw = CacheService.getScriptCache().get(key);
  if (!raw) {
    raw = PropertiesService.getScriptProperties().getProperty(key);
    if (raw) {
      CacheService.getScriptCache().put(key, raw, 21600);
    }
  }
  if (!raw) return null;
  const sess = safeJsonParse_(raw, null);
  if (!sess || sess.expiresAt < Date.now()) {
    destroySession_(token);
    return null;
  }
  const user = dbGetById_('Users', sess.userId);
  if (!user || !(user.active === true || String(user.active).toLowerCase() === 'true')) {
    return null;
  }
  return sanitizeUser_(user);
}

function destroySession_(token) {
  if (!token) return;
  const key = 'sess_' + token;
  PropertiesService.getScriptProperties().deleteProperty(key);
  CacheService.getScriptCache().remove(key);
}

function requireRole_(user, allowedRoles) {
  if (!user) throw new Error('UNAUTHORIZED: Authentication required');
  if (allowedRoles.indexOf(user.role) === -1) {
    throw new Error('FORBIDDEN: Insufficient permissions for role ' + user.role);
  }
}

function handleLogin_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  if (!email || !password) throw new Error('Email and password are required');

  const users = dbGetAll_('Users', true);
  const found = users.find(function(u) {
    return String(u.email || '').trim().toLowerCase() === email;
  });
  if (!found) throw new Error('Invalid email or password');

  const isActive = found.active === true || String(found.active).toLowerCase() === 'true';
  if (!isActive) throw new Error('Account is disabled. Contact Admin.');

  const expected = hashPassword_(password, String(found.salt || ''));
  if (expected !== String(found.passwordHash || '')) {
    throw new Error('Invalid email or password');
  }

  const safeUser = sanitizeUser_(found);
  const token = createSession_(safeUser);
  const settings = getPublicSettings_();
  return { token: token, user: safeUser, settings: settings };
}

function handleChangePassword_(user, payload) {
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');
  if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');

  const fullUser = dbGetById_('Users', user.id);
  if (!fullUser) throw new Error('User not found');

  const check = hashPassword_(currentPassword, String(fullUser.salt || ''));
  if (check !== String(fullUser.passwordHash || '')) {
    throw new Error('Current password is incorrect');
  }

  const nextSalt = Utilities.getUuid();
  const nextHash = hashPassword_(newPassword, nextSalt);
  dbUpdate_('Users', user.id, {
    salt: nextSalt,
    passwordHash: nextHash,
    updatedAt: new Date().toISOString()
  });
  return { updated: true };
}

function handleListUsers_(user) {
  // ADMIN sees full user list; MEDIA_BUYER & ACCOUNTANT & TEAM get lightweight directory for task assignment
  const users = dbGetAll_('Users').map(sanitizeUser_);
  if (user.role === 'ADMIN') return { users: users };
  return {
    users: users.filter(function(u) { return u.active; }).map(function(u) {
      return { id: u.id, name: u.name, role: u.role };
    })
  };
}

function handleCreateUser_(user, payload) {
  requireRole_(user, ['ADMIN']);
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const role = String(payload.role || 'TEAM').toUpperCase();

  if (!name || !email || password.length < 6) {
    throw new Error('Name, email, and password (min 6 chars) are required');
  }
  if (VALID_ROLES.indexOf(role) === -1) throw new Error('Invalid role');

  const exists = dbGetAll_('Users', true).some(function(u) {
    return String(u.email || '').trim().toLowerCase() === email;
  });
  if (exists) throw new Error('Email already exists');

  const now = new Date().toISOString();
  const salt = Utilities.getUuid();
  const record = {
    id: generateId_('usr'),
    name: name,
    email: email,
    passwordHash: hashPassword_(password, salt),
    salt: salt,
    role: role,
    phone: String(payload.phone || ''),
    active: true,
    createdAt: now,
    updatedAt: now
  };
  dbInsert_('Users', record);
  logActivity_('USER', record.id, '', 'USER_CREATED', 'Created user ' + name + ' (' + role + ')', user);
  return { user: sanitizeUser_(record) };
}

function handleUpdateUser_(user, payload) {
  const targetId = payload.id || user.id;
  if (targetId !== user.id) {
    requireRole_(user, ['ADMIN']);
  }
  const existing = dbGetById_('Users', targetId);
  if (!existing) throw new Error('User not found');

  const patch = { updatedAt: new Date().toISOString() };
  if (payload.name !== undefined) patch.name = String(payload.name).trim();
  if (payload.phone !== undefined) patch.phone = String(payload.phone).trim();

  if (user.role === 'ADMIN') {
    if (payload.role && VALID_ROLES.indexOf(payload.role) !== -1) patch.role = payload.role;
    if (payload.active !== undefined) patch.active = Boolean(payload.active);
    if (payload.password && String(payload.password).length >= 6) {
      const salt = Utilities.getUuid();
      patch.salt = salt;
      patch.passwordHash = hashPassword_(String(payload.password), salt);
    }
  }

  const updated = dbUpdate_('Users', targetId, patch);
  return { user: sanitizeUser_(updated) };
}


// -------------------- Finance.gs --------------------

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
  const lines = (items || []).map(function(it) {
    const qty = toNum_(it.quantity || 1);
    const unitPrice = toNum_(it.unitPrice || 0);
    const taxRate = toNum_(it.taxRate !== undefined && it.taxRate !== '' ? it.taxRate : 19);
    const lineNet = round2_(qty * unitPrice);
    subtotal += lineNet;
    return {
      description: String(it.description || ''),
      quantity: qty,
      unitPrice: unitPrice,
      taxRate: taxRate,
      lineNet: lineNet
    };
  });

  subtotal = round2_(subtotal);
  const disc = round2_(toNum_(discount || 0));
  const netCommercial = Math.max(0, round2_(subtotal - disc));
  const discountRatio = subtotal > 0 ? (netCommercial / subtotal) : 1;

  let taxTotal = 0;
  const normalized = lines.map(function(l) {
    const lineTax = round2_(l.lineNet * discountRatio * (l.taxRate / 100));
    taxTotal += lineTax;
    return {
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxRate: l.taxRate,
      lineTotal: round2_(l.lineNet + lineTax)
    };
  });

  taxTotal = round2_(taxTotal);
  const total = round2_(netCommercial + taxTotal);
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

  // Auto-resolve or create client if clientName provided
  let clientId = String(payload.clientId || '').trim();
  const clientName = String(payload.clientName || '').trim();
  if (!clientId && clientName) {
    const clients = dbGetAll_('Clients');
    const existing = clients.find(function(c) {
      return (c.company || c.name || '').trim().toLowerCase() === clientName.toLowerCase();
    });
    if (existing) {
      clientId = existing.id;
    } else {
      clientId = generateId_('cli');
      dbInsert_('Clients', {
        id: clientId,
        name: clientName,
        company: clientName,
        email: '',
        phone: '',
        address: '',
        taxId: '',
        defaultTaxRate: 19,
        tagsJson: '[]',
        notesJson: '[]',
        portalToken: generateToken_(),
        createdAt: now,
        updatedAt: now
      });
    }
  }

  if (payload.id) {
    const existing = dbGetById_('Invoices', payload.id);
    if (!existing) throw new Error('Invoice not found');
    const updated = dbUpdate_('Invoices', payload.id, {
      clientId: clientId || existing.clientId,
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
    clientId: clientId,
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
  const expenses = dbGetAll_('Expenses');
  const supMap = {};
  suppliers.forEach(function(s) { supMap[s.id] = s; });

  const expByBill = {};
  expenses.forEach(function(e) {
    if (e.supplierBillId) {
      expByBill[e.supplierBillId] = (expByBill[e.supplierBillId] || 0) + toNum_(e.amountDzd || e.amount);
    }
  });

  return {
    suppliers: suppliers,
    bills: bills.map(function(b) {
      const total = toNum_(b.amountDzd || b.amount);
      const paid = round2_(expByBill[b.id] || (b.status === 'PAYEE' ? total : 0));
      const remaining = round2_(Math.max(0, total - paid));
      let status = b.status || 'A_PAYER';
      if (paid >= total - 0.01 && total > 0) status = 'PAYEE';
      else if (paid > 0) status = 'PARTIELLE';

      return Object.assign({}, b, {
        supplierName: supMap[b.supplierId] ? supMap[b.supplierId].name : '',
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: remaining,
        status: status
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
 * Records a supplier bill payment (full or partial versement).
 * Automatically creates the linked Expense row in Expenses sheet
 * and updates the bill status (PARTIELLE or PAYEE).
 */
function handleRecordSupplierBillPayment_(user, payload) {
  requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const billId = payload.billId || payload.id;
    const bill = dbGetById_('SupplierBills', billId);
    if (!bill) throw new Error('Supplier bill not found');

    const total = toNum_(bill.amountDzd || bill.amount);
    const expenses = dbGetAll_('Expenses');
    let previouslyPaid = 0;
    expenses.forEach(function(e) {
      if (e.supplierBillId === bill.id) {
        previouslyPaid += toNum_(e.amountDzd || e.amount);
      }
    });

    const remaining = round2_(Math.max(0, total - previouslyPaid));
    if (remaining <= 0) throw new Error('Cette facture fournisseur est déjà totalement payée.');

    const paymentAmount = round2_(Math.min(remaining, toNum_(payload.amount)));
    if (paymentAmount <= 0) throw new Error('Le montant du versement doit être supérieur à 0.');

    const supplier = dbGetById_('Suppliers', bill.supplierId);
    const now = new Date().toISOString();
    const payDate = payload.date || payload.paymentDate || now.slice(0, 10);
    const method = payload.method || 'VIREMENT';

    // 1. Create linked Expense
    const exp = {
      id: generateId_('exp'),
      date: payDate,
      category: bill.category || 'AUTRE',
      description: '[Versement Fournisseur: ' + (supplier ? supplier.name : '') + '] ' + bill.description + (paymentAmount < remaining ? ' (Versement partiel)' : ' (Solde)'),
      amount: paymentAmount,
      currency: bill.currency || 'DZD',
      exchangeRate: toNum_(bill.exchangeRate || 1),
      amountDzd: paymentAmount,
      supplierBillId: bill.id,
      receiptUrl: '',
      receiptFileId: '',
      notes: (payload.notes ? payload.notes + ' • ' : '') + 'Méthode: ' + method,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    };
    dbInsert_('Expenses', exp);

    // 2. Update Bill Status
    const newTotalPaid = round2_(previouslyPaid + paymentAmount);
    const isFullyPaid = newTotalPaid >= total - 0.01;
    const newStatus = isFullyPaid ? 'PAYEE' : 'PARTIELLE';

    const updatedBill = dbUpdate_('SupplierBills', bill.id, {
      status: newStatus,
      paidAt: isFullyPaid ? payDate : bill.paidAt,
      expenseId: exp.id,
      updatedAt: now
    });

    logActivity_('SUPPLIER_BILL', bill.id, bill.supplierId, 'BILL_PAYMENT', 'Versement ' + paymentAmount + ' DZD pour ' + bill.description + ' (' + newStatus + ')', user);

    return {
      bill: Object.assign({}, updatedBill, {
        paidAmount: newTotalPaid,
        remainingAmount: round2_(Math.max(0, total - newTotalPaid)),
        status: newStatus
      }),
      expense: exp
    };
  } finally {
    lock.releaseLock();
  }
}

function handlePaySupplierBill_(user, payload) {
  const bill = dbGetById_('SupplierBills', payload.id);
  if (!bill) throw new Error('Supplier bill not found');
  const expenses = dbGetAll_('Expenses');
  let previouslyPaid = 0;
  expenses.forEach(function(e) {
    if (e.supplierBillId === bill.id) previouslyPaid += toNum_(e.amountDzd || e.amount);
  });
  const remaining = round2_(Math.max(0, toNum_(bill.amountDzd || bill.amount) - previouslyPaid));
  return handleRecordSupplierBillPayment_(user, {
    billId: payload.id,
    amount: payload.amount ? toNum_(payload.amount) : remaining,
    date: payload.date,
    method: payload.method || 'VIREMENT',
    notes: payload.notes || 'Paiement fournisseur'
  });
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


// -------------------- CrmOps.gs --------------------

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


// -------------------- DriveBackup.gs --------------------

/**
 * ============================================================================
 * ADPOWRS DIGITAL ERP — GOOGLE DRIVE FILES, AUTO-BACKUP & YEARLY ARCHIVE
 * ============================================================================
 */

function ensureDriveFolders_() {
  const rootName = 'Adpowrs_ERP';
  const rootIter = DriveApp.getFoldersByName(rootName);
  const root = rootIter.hasNext() ? rootIter.next() : DriveApp.createFolder(rootName);

  function getOrCreateSub(parent, name) {
    const it = parent.getFoldersByName(name);
    return it.hasNext() ? it.next() : parent.createFolder(name);
  }

  return {
    root: root,
    receipts: getOrCreateSub(root, 'Receipts'),
    backups: getOrCreateSub(root, 'Backups'),
    branding: getOrCreateSub(root, 'Branding'),
    archives: getOrCreateSub(root, 'Archives')
  };
}

function uploadReceiptToDrive_(base64Data, fileName, mimeType) {
  const settings = getSettingsMap_();
  let folder;
  try {
    folder = settings.driveReceiptsFolderId
      ? DriveApp.getFolderById(settings.driveReceiptsFolderId)
      : ensureDriveFolders_().receipts;
  } catch (e) {
    folder = ensureDriveFolders_().receipts;
  }

  const cleanBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
  const bytes = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', new Date().toISOString().slice(0, 10) + '_' + fileName);
  const file = folder.createFile(blob);

  return {
    fileId: file.getId(),
    url: file.getUrl()
  };
}

function handleUploadLogo_(user, payload) {
  requireRole_(user, ['ADMIN']);
  const folders = ensureDriveFolders_();
  const cleanBase64 = String(payload.base64 || '').replace(/^data:[^;]+;base64,/, '');
  const bytes = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(bytes, payload.mimeType || 'image/png', 'adpowrs_logo_' + Date.now() + '.png');
  const file = folders.branding.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const directUrl = 'https://lh3.googleusercontent.com/d/' + file.getId();
  setSetting_('logoUrl', directUrl);
  return { logoUrl: directUrl, fileId: file.getId() };
}

/**
 * Creates a full timestamped backup copy of Adpowrs_ERP_DB inside /Adpowrs_ERP/Backups
 * and automatically keeps the latest 12 backups to save Drive space.
 */
function runWeeklyBackupInternal_() {
  const ss = getDatabaseSpreadsheet_();
  const folders = ensureDriveFolders_();
  const stamp = Utilities.formatDate(new Date(), 'Africa/Algiers', 'yyyy-MM-dd_HH-mm');
  const backupName = 'Adpowrs_ERP_Backup_' + stamp;
  const copied = DriveApp.getFileById(ss.getId()).makeCopy(backupName, folders.backups);

  // Prune old backups (keep last 12)
  const files = [];
  const iter = folders.backups.getFiles();
  while (iter.hasNext()) {
    files.push(iter.next());
  }
  files.sort(function(a, b) {
    return b.getDateCreated().getTime() - a.getDateCreated().getTime();
  });
  for (let i = 12; i < files.length; i++) {
    files[i].setTrashed(true);
  }

  const now = new Date().toISOString();
  setSetting_('lastBackupAt', now);
  return {
    backupName: backupName,
    backupUrl: copied.getUrl(),
    backupId: copied.getId(),
    createdAt: now,
    retainedCount: Math.min(files.length, 12)
  };
}

function handleTriggerBackup_(user) {
  requireRole_(user, ['ADMIN']);
  const res = runWeeklyBackupInternal_();
  logActivity_('SYSTEM', res.backupId, '', 'BACKUP_CREATED', 'Manual backup created: ' + res.backupName, user);
  return res;
}

function handleListBackups_(user) {
  requireRole_(user, ['ADMIN']);
  const folders = ensureDriveFolders_();
  const list = [];
  const iter = folders.backups.getFiles();
  while (iter.hasNext()) {
    const f = iter.next();
    list.push({
      id: f.getId(),
      name: f.getName(),
      url: f.getUrl(),
      createdAt: f.getDateCreated().toISOString()
    });
  }
  list.sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); });
  return { backups: list };
}

/**
 * Yearly Archive Tool:
 * 1. Creates a snapshot archive spreadsheet `Adpowrs_ERP_Archive_<year>` inside /Adpowrs_ERP/Archives
 * 2. Moves closed records from that year (PAYEE/ANNULEE invoices, their payments, expenses, DONE tasks, AdSpend, Benefits, ActivityLog)
 * 3. Rolls forward the net cash impact of archived payments & expenses into `openingTreasuryBalance`
 *    so real-time Treasury remains 100% exact!
 */
function handleArchiveYear_(user, payload) {
  requireRole_(user, ['ADMIN']);
  const year = String(payload.year || (new Date().getFullYear() - 1));
  if (!/^\d{4}$/.test(year)) throw new Error('Invalid year format (expected YYYY)');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // Safety backup before archiving
    const preBackup = runWeeklyBackupInternal_();

    const ss = getDatabaseSpreadsheet_();
    const folders = ensureDriveFolders_();
    const archiveSs = SpreadsheetApp.create('Adpowrs_ERP_Archive_' + year);
    DriveApp.getFileById(archiveSs.getId()).moveTo(folders.archives);

    const archivedCounts = {};
    let archivedCashIn = 0;
    let archivedCashOut = 0;

    function archiveRowsFromSheet(sheetName, predicate) {
      const srcSheet = ss.getSheetByName(sheetName);
      const headers = SHEET_SCHEMAS[sheetName];
      if (!srcSheet || srcSheet.getLastRow() <= 1) {
        archivedCounts[sheetName] = 0;
        return [];
      }
      const allValues = srcSheet.getRange(2, 1, srcSheet.getLastRow() - 1, headers.length).getValues();
      const keepRows = [];
      const moveRows = [];

      allValues.forEach(function(rowArr) {
        const obj = {};
        headers.forEach(function(h, idx) { obj[h] = parseCellValue_(rowArr[idx]); });
        if (predicate(obj)) {
          moveRows.push(rowArr);
        } else {
          keepRows.push(rowArr);
        }
      });

      if (moveRows.length > 0) {
        const archSheet = archiveSs.insertSheet(sheetName);
        archSheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
        archSheet.getRange(2, 1, moveRows.length, headers.length).setValues(moveRows);

        srcSheet.getRange(2, 1, srcSheet.getLastRow() - 1, headers.length).clearContent();
        if (keepRows.length > 0) {
          srcSheet.getRange(2, 1, keepRows.length, headers.length).setValues(keepRows);
        }
        invalidateSheetCache_(sheetName);
      }
      archivedCounts[sheetName] = moveRows.length;
      return moveRows;
    }

    // Identify closed invoices from target year
    const closedInvIds = {};
    archiveRowsFromSheet('Invoices', function(inv) {
      const isClosed = inv.status === 'PAYEE' || inv.status === 'ANNULEE';
      const inYear = String(inv.issueDate || inv.createdAt).slice(0, 4) === year;
      if (isClosed && inYear) {
        closedInvIds[inv.id] = true;
        return true;
      }
      return false;
    });

    // Archive payments belonging to those closed invoices
    archiveRowsFromSheet('Payments', function(p) {
      if (closedInvIds[p.invoiceId]) {
        if (p.status !== 'REJECTED') archivedCashIn += toNum_(p.amountDzd);
        return true;
      }
      return false;
    });

    // Archive expenses from target year
    archiveRowsFromSheet('Expenses', function(e) {
      if (String(e.date || e.createdAt).slice(0, 4) === year) {
        archivedCashOut += toNum_(e.amountDzd);
        return true;
      }
      return false;
    });

    // Archive DONE tasks, AdSpend, Benefits, ActivityLog from target year
    archiveRowsFromSheet('Tasks', function(t) {
      return t.status === 'DONE' && String(t.updatedAt || t.createdAt).slice(0, 4) === year;
    });
    archiveRowsFromSheet('AdSpend', function(a) {
      return String(a.month || a.createdAt).slice(0, 4) === year;
    });
    archiveRowsFromSheet('Benefits', function(b) {
      return String(b.date || b.createdAt).slice(0, 4) === year;
    });
    archiveRowsFromSheet('ActivityLog', function(a) {
      return String(a.createdAt).slice(0, 4) === year;
    });

    // Roll forward cash impact into openingTreasuryBalance
    const settings = getSettingsMap_();
    const prevOpening = toNum_(settings.openingTreasuryBalance || 0);
    const nextOpening = round2_(prevOpening + archivedCashIn - archivedCashOut);
    setSetting_('openingTreasuryBalance', String(nextOpening));

    // Delete empty default Sheet1 in archive workbook
    const defSheet = archiveSs.getSheetByName('Sheet1') || archiveSs.getSheetByName('Feuille 1');
    if (defSheet && archiveSs.getSheets().length > 1) {
      archiveSs.deleteSheet(defSheet);
    }

    logActivity_('SYSTEM', archiveSs.getId(), '', 'YEAR_ARCHIVED', 'Archived year ' + year + '; rolled treasury opening to ' + nextOpening + ' DZD', user);

    return {
      year: year,
      archiveUrl: archiveSs.getUrl(),
      preBackupUrl: preBackup.backupUrl,
      archivedCounts: archivedCounts,
      newOpeningTreasuryBalance: nextOpening
    };
  } finally {
    lock.releaseLock();
  }
}


// -------------------- Triggers.gs --------------------

/**
 * ============================================================================
 * ADPOWRS DIGITAL ERP — AUTOMATED TRIGGERS (RECURRING, REMINDERS, BACKUP)
 * ============================================================================
 */

function installAdpowrsTriggers() {
  const existing = ScriptApp.getProjectTriggers();
  const managed = ['cronGenerateRecurringInvoices', 'cronSendPaymentReminders', 'cronWeeklyDriveBackup'];
  existing.forEach(function(tr) {
    if (managed.indexOf(tr.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(tr);
    }
  });

  // 06:00 Daily — Recurring Invoices
  ScriptApp.newTrigger('cronGenerateRecurringInvoices')
    .timeBased().everyDays(1).atHour(6).create();

  // 09:00 Daily — Automated Payment Reminders
  ScriptApp.newTrigger('cronSendPaymentReminders')
    .timeBased().everyDays(1).atHour(9).create();

  // Friday 02:00 Weekly — Full Google Drive Backup
  ScriptApp.newTrigger('cronWeeklyDriveBackup')
    .timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(2).create();
}

function advanceRecurringDate_(dateStr, frequency) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (frequency === 'QUARTERLY') d.setUTCMonth(d.getUTCMonth() + 3);
  else if (frequency === 'YEARLY') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function cronGenerateRecurringInvoices() {
  const today = new Date().toISOString().slice(0, 10);
  const rules = dbGetAll_('Recurring', true);
  const systemUser = { id: 'system', name: 'Auto-Billing', role: 'ADMIN' };

  rules.forEach(function(rule) {
    const isAct = rule.active === true || String(rule.active).toLowerCase() === 'true';
    if (!isAct || !rule.nextRunAt || String(rule.nextRunAt).slice(0, 10) > today) return;

    try {
      const items = safeJsonParse_(rule.itemsJson, []);
      handleSaveInvoice_(systemUser, {
        docType: 'FACTURE',
        clientId: rule.clientId,
        currency: rule.currency,
        exchangeRate: rule.exchangeRate,
        items: items,
        discount: rule.discount,
        notes: rule.notes || rule.title,
        issueDate: today,
        finalize: true
      });
      const nextDate = advanceRecurringDate_(String(rule.nextRunAt).slice(0, 10), rule.frequency);
      dbUpdate_('Recurring', rule.id, {
        lastRunAt: today,
        nextRunAt: nextDate,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      Logger.log('Recurring invoice error for ' + rule.id + ': ' + err.message);
    }
  });
}

function cronSendPaymentReminders() {
  const settings = getSettingsMap_();
  if (String(settings.remindersEnabled).toLowerCase() !== 'true') return;

  const leadDays = toNum_(settings.reminderLeadDays || 3);
  const intervalDays = toNum_(settings.reminderIntervalDays || 5);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const clients = dbGetAll_('Clients', true);
  const clientMap = {};
  clients.forEach(function(c) { clientMap[c.id] = c; });

  const payments = dbGetAll_('Payments', true);
  const paysByInv = {};
  payments.forEach(function(p) {
    if (!paysByInv[p.invoiceId]) paysByInv[p.invoiceId] = [];
    paysByInv[p.invoiceId].push(p);
  });

  const invoices = dbGetAll_('Invoices', true);
  invoices.forEach(function(rawInv) {
    const inv = enrichInvoice_(rawInv, paysByInv, clientMap);
    if (inv.docType !== 'FACTURE' || inv.status === 'DRAFT' || inv.status === 'ANNULEE' || inv.status === 'PAYEE' || inv.remaining <= 0) return;
    if (!inv.clientEmail || !inv.dueDate) return;

    const dueMs = new Date(String(inv.dueDate).slice(0, 10) + 'T00:00:00Z').getTime();
    const todayMs = new Date(todayStr + 'T00:00:00Z').getTime();
    const daysUntilDue = Math.round((dueMs - todayMs) / 86400000);

    // 1. Pre-due courtesy reminder
    if (daysUntilDue > 0 && daysUntilDue <= leadDays && !inv.preReminderAt) {
      try {
        MailApp.sendEmail({
          to: inv.clientEmail,
          subject: settings.agencyName + ' — Rappel d\'échéance ' + inv.number,
          body: 'Bonjour ' + inv.clientName + ',\n\nLa facture ' + inv.number + ' (' + inv.remaining + ' ' + inv.currency + ') arrive à échéance le ' + inv.dueDate + '.\n\nCordialement,\n' + settings.agencyName,
          name: settings.agencyName
        });
        dbUpdate_('Invoices', inv.id, { preReminderAt: new Date().toISOString() });
      } catch (e) {}
    }

    // 2. Periodic overdue reminder
    if (daysUntilDue < 0) {
      const lastRemMs = inv.lastReminderAt ? new Date(inv.lastReminderAt).getTime() : 0;
      if (!lastRemMs || (Date.now() - lastRemMs) >= intervalDays * 86400000) {
        try {
          MailApp.sendEmail({
            to: inv.clientEmail,
            subject: settings.agencyName + ' — Facture en retard ' + inv.number,
            body: 'Bonjour ' + inv.clientName + ',\n\nSauf erreur de notre part, la facture ' + inv.number + ' (reste à payer : ' + inv.remaining + ' ' + inv.currency + ') est échue depuis le ' + inv.dueDate + '.\nMerci de bien vouloir procéder au règlement.\n\nCordialement,\n' + settings.agencyName,
            name: settings.agencyName
          });
          dbUpdate_('Invoices', inv.id, { lastReminderAt: new Date().toISOString() });
        } catch (e) {}
      }
    }
  });
}

function cronWeeklyDriveBackup() {
  try {
    runWeeklyBackupInternal_();
  } catch (err) {
    Logger.log('Weekly backup error: ' + err.message);
  }
}


// -------------------- Code.gs --------------------

/**
 * ============================================================================
 * ADPOWRS DIGITAL ERP — MAIN GOOGLE APPS SCRIPT API ROUTER
 * ============================================================================
 * Frontend calls `POST <WEB_APP_URL>` with `Content-Type: text/plain;charset=utf-8`
 * and body: JSON.stringify({ action: '...', token: '...', payload: { ... } })
 */

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getPublicSettings_() {
  const s = getSettingsMap_();
  return {
    agencyName: s.agencyName || 'Adpowrs Digital',
    tagline: s.tagline || '',
    email: s.email || '',
    phone: s.phone || '',
    address: s.address || '',
    website: s.website || '',
    taxId: s.taxId || '',
    rcNumber: s.rcNumber || '',
    nisNumber: s.nisNumber || '',
    bankAccount: s.bankAccount || '',
    logoUrl: s.logoUrl || '',
    primaryColor: s.primaryColor || '#6366f1',
    secondaryColor: s.secondaryColor || '#0ea5e9',
    defaultCurrency: s.defaultCurrency || 'DZD',
    defaultTaxRate: toNum_(s.defaultTaxRate || 19),
    eurRate: toNum_(s.eurRate || 245),
    usdRate: toNum_(s.usdRate || 225),
    openingTreasuryBalance: toNum_(s.openingTreasuryBalance || 0),
    remindersEnabled: String(s.remindersEnabled).toLowerCase() === 'true',
    reminderLeadDays: toNum_(s.reminderLeadDays || 3),
    reminderIntervalDays: toNum_(s.reminderIntervalDays || 5),
    portalBaseUrl: s.portalBaseUrl || '',
    lastBackupAt: s.lastBackupAt || ''
  };
}

function handleUpdateSettings_(user, payload) {
  requireRole_(user, ['ADMIN']);
  const allowed = [
    'agencyName', 'tagline', 'email', 'phone', 'address', 'website',
    'taxId', 'rcNumber', 'nisNumber', 'bankAccount', 'logoUrl',
    'primaryColor', 'secondaryColor', 'defaultCurrency', 'defaultTaxRate',
    'eurRate', 'usdRate', 'openingTreasuryBalance', 'remindersEnabled',
    'reminderLeadDays', 'reminderIntervalDays', 'portalBaseUrl'
  ];
  allowed.forEach(function(k) {
    if (payload[k] !== undefined) {
      setSetting_(k, String(payload[k]));
    }
  });
  return { settings: getPublicSettings_() };
}

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : 'health';
  if (action === 'publicPortal' && e.parameter.token) {
    try {
      return jsonResponse_({ ok: true, data: handlePublicPortal_({ token: e.parameter.token, month: e.parameter.month }) });
    } catch (err) {
      return jsonResponse_({ ok: false, error: err.message });
    }
  }
  return jsonResponse_({
    ok: true,
    service: 'Adpowrs Digital ERP — Google Apps Script API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = safeJsonParse_(rawBody, {});
    const action = String(body.action || '');
    const token = String(body.token || '');
    const payload = body.payload || {};

    // Public endpoints (no token required)
    if (action === 'health') {
      return jsonResponse_({ ok: true, data: { status: 'online', time: new Date().toISOString() } });
    }
    if (action === 'login') {
      return jsonResponse_({ ok: true, data: handleLogin_(payload) });
    }
    if (action === 'publicPortal') {
      return jsonResponse_({ ok: true, data: handlePublicPortal_(payload) });
    }

    // Authenticated endpoints
    const user = verifySession_(token);
    if (!user) {
      return jsonResponse_({ ok: false, code: 'UNAUTHORIZED', error: 'Session expired or invalid. Please log in again.' });
    }

    let data;
    switch (action) {
      case 'me':
        data = { user: user, settings: getPublicSettings_() };
        break;
      case 'logout':
        destroySession_(token);
        data = { loggedOut: true };
        break;
      case 'changePassword':
        data = handleChangePassword_(user, payload);
        break;

      // Settings & Users
      case 'getSettings':
        data = { settings: getPublicSettings_() };
        break;
      case 'updateSettings':
        data = handleUpdateSettings_(user, payload);
        break;
      case 'uploadLogo':
        data = handleUploadLogo_(user, payload);
        break;
      case 'listUsers':
        data = handleListUsers_(user);
        break;
      case 'createUser':
        data = handleCreateUser_(user, payload);
        break;
      case 'updateUser':
        data = handleUpdateUser_(user, payload);
        break;

      // Dashboard & Benefits
      case 'getDashboard':
        data = handleGetDashboard_(user, payload);
        break;
      case 'getBenefits':
        data = handleGetBenefits_(user, payload);
        break;
      case 'saveBenefitTx':
        data = handleSaveBenefitTx_(user, payload);
        break;
      case 'deleteBenefitTx':
        requireRole_(user, ['ADMIN']);
        data = { deleted: dbDelete_('Benefits', payload.id) };
        break;

      // Invoices, Quotes, Payments, Recurring
      case 'listInvoices':
        data = handleListInvoices_(user, payload);
        break;
      case 'saveInvoice':
        data = handleSaveInvoice_(user, payload);
        break;
      case 'finalizeInvoice':
        data = handleFinalizeInvoice_(user, payload);
        break;
      case 'convertQuoteToInvoice':
        data = handleConvertQuoteToInvoice_(user, payload);
        break;
      case 'deleteInvoice':
        data = handleDeleteInvoice_(user, payload);
        break;
      case 'recordPayment':
        data = handleRecordPayment_(user, payload);
        break;
      case 'sendInvoiceEmail':
        data = handleSendInvoiceEmail_(user, payload);
        break;
      case 'saveRecurring':
        data = handleSaveRecurring_(user, payload);
        break;
      case 'deleteRecurring':
        requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
        data = { deleted: dbDelete_('Recurring', payload.id) };
        break;

      // Expenses, Budgets & Suppliers
      case 'listExpenses':
        data = handleListExpenses_(user);
        break;
      case 'saveExpense':
        data = handleSaveExpense_(user, payload);
        break;
      case 'deleteExpense':
        requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
        data = { deleted: dbDelete_('Expenses', payload.id) };
        break;
      case 'saveBudgetGoal':
        data = handleSaveBudgetGoal_(user, payload);
        break;
      case 'listSuppliers':
        data = handleListSuppliers_(user);
        break;
      case 'saveSupplier':
        data = handleSaveSupplier_(user, payload);
        break;
      case 'deleteSupplier':
        requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
        data = { deleted: dbDelete_('Suppliers', payload.id) };
        break;
      case 'saveSupplierBill':
        data = handleSaveSupplierBill_(user, payload);
        break;
      case 'paySupplierBill':
        data = handlePaySupplierBill_(user, payload);
        break;
      case 'recordSupplierBillPayment':
        data = handleRecordSupplierBillPayment_(user, payload);
        break;
      case 'deleteSupplierBill':
        requireRole_(user, ['ADMIN', 'ACCOUNTANT']);
        data = { deleted: dbDelete_('SupplierBills', payload.id) };
        break;

      // Leads & Clients 360° & Reports
      case 'listLeads':
        data = handleListLeads_(user);
        break;
      case 'saveLead':
        data = handleSaveLead_(user, payload);
        break;
      case 'deleteLead':
        requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
        data = { deleted: dbDelete_('Leads', payload.id) };
        break;
      case 'convertLeadToClient':
        data = handleConvertLeadToClient_(user, payload);
        break;
      case 'listClients':
        data = handleListClients_(user);
        break;
      case 'saveClient':
        data = handleSaveClient_(user, payload);
        break;
      case 'deleteClient':
        requireRole_(user, ['ADMIN']);
        data = { deleted: dbDelete_('Clients', payload.id) };
        break;
      case 'getClientDetail':
        data = handleGetClientDetail_(user, payload);
        break;
      case 'getClientReport':
        data = handleGetClientReport_(user, payload);
        break;

      // Services
      case 'listServices':
        data = handleListServices_(user);
        break;
      case 'saveService':
        data = handleSaveService_(user, payload);
        break;
      case 'deleteService':
        requireRole_(user, ['ADMIN']);
        data = { deleted: dbDelete_('Services', payload.id) };
        break;

      // AdSpend & Testili
      case 'listAdSpend':
        data = handleListAdSpend_(user);
        break;
      case 'saveAdSpend':
        data = handleSaveAdSpend_(user, payload);
        break;
      case 'deleteAdSpend':
        requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
        data = { deleted: dbDelete_('AdSpend', payload.id) };
        break;
      case 'listTestili':
        data = handleListTestili_(user);
        break;
      case 'saveTestili':
        data = handleSaveTestili_(user, payload);
        break;
      case 'deleteTestili':
        requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
        data = { deleted: dbDelete_('Testili', payload.id) };
        break;
      case 'pushTestiliToAdSpend':
        data = handlePushTestiliToAdSpend_(user, payload);
        break;

      // Tasks & Project Templates
      case 'listTasks':
        data = handleListTasks_(user);
        break;
      case 'saveTask':
        data = handleSaveTask_(user, payload);
        break;
      case 'deleteTask':
        requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
        data = { deleted: dbDelete_('Tasks', payload.id) };
        break;
      case 'listTemplates':
        data = handleListTemplates_(user);
        break;
      case 'saveTemplate':
        data = handleSaveTemplate_(user, payload);
        break;
      case 'deleteTemplate':
        requireRole_(user, ['ADMIN', 'MEDIA_BUYER']);
        data = { deleted: dbDelete_('Templates', payload.id) };
        break;
      case 'applyTemplate':
        data = handleApplyTemplate_(user, payload);
        break;

      // Search, Backups & Archive
      case 'globalSearch':
        data = handleGlobalSearch_(user, payload);
        break;
      case 'triggerBackup':
        data = handleTriggerBackup_(user);
        break;
      case 'listBackups':
        data = handleListBackups_(user);
        break;
      case 'archiveYear':
        data = handleArchiveYear_(user, payload);
        break;

      default:
        return jsonResponse_({ ok: false, error: 'Unknown action: ' + action });
    }

    return jsonResponse_({ ok: true, data: data });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    const code = msg.indexOf('FORBIDDEN') === 0 ? 'FORBIDDEN' : (msg.indexOf('UNAUTHORIZED') === 0 ? 'UNAUTHORIZED' : 'ERROR');
    return jsonResponse_({ ok: false, code: code, error: msg });
  }
}
