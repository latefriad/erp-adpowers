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
