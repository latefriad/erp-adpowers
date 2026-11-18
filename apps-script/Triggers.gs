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
