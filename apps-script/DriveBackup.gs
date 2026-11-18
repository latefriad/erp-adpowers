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
