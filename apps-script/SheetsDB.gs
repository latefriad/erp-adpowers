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
