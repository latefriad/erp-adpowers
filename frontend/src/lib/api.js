import { runDemoAction } from './demoStore';

const GAS_URL_KEY = 'adpowrs_gas_url';
const TOKEN_KEY = 'adpowrs_token';
export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbxXIfMoGlPaMLrghl9UjITUEdjtvcUyS3aLNKEMzX8uhc-U9Cahg3ctvL2qP6ag5NOiVA/exec';

export function getGasApiUrl() {
  try {
    const custom = localStorage.getItem(GAS_URL_KEY);
    if (custom && custom.trim()) return custom.trim();
  } catch (e) {}
  return (import.meta.env.VITE_GAS_API_URL || DEFAULT_GAS_URL).trim();
}

export function setGasApiUrl(url) {
  try {
    if (url && url.trim()) localStorage.setItem(GAS_URL_KEY, url.trim());
    else localStorage.removeItem(GAS_URL_KEY);
  } catch (e) {}
}

export function isDemoMode() {
  return !getGasApiUrl();
}

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

export class GasApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GasApiError';
    this.code = code;
  }
}

/**
 * Calls the Google Apps Script Web App via CORS-safe `POST text/plain`.
 * If no GAS URL is configured yet or if GAS returns authorization/network errors,
 * it safely falls back to the local store so the user's data is NEVER lost.
 */
export async function gasCall(action, payload = {}, opts = {}) {
  const apiUrl = getGasApiUrl();
  const token = opts.skipAuth ? '' : getAuthToken();

  const getDemoUser = () => {
    try {
      const saved = localStorage.getItem('adpowrs_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  };

  if (!apiUrl) {
    return runDemoAction(action, payload, getDemoUser());
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, payload })
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    // Check specifically if Google returned an access/authorization restriction page
    // (e.g. redirected to accounts.google.com sign-in or "Une autorisation est nécessaire")
    const isHtml = contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html');
    const isGoogleAuthBlocked = isHtml && (
      text.includes('accounts.google.com') ||
      text.includes('Une autorisation est nécessaire') ||
      text.includes('Authorization is required') ||
      text.includes('Sign in - Google Accounts') ||
      res.status === 401 ||
      res.status === 403
    );

    if (isGoogleAuthBlocked) {
      console.warn(`[Adpowrs API] Google Apps Script deployment is restricted (status ${res.status}). Triggering setup notification.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adpowrs:gas_auth_warning', {
          detail: { status: res.status, url: apiUrl }
        }));
      }
      return runDemoAction(action, payload, getDemoUser());
    }

    if (!res.ok || isHtml) {
      console.warn(`[Adpowrs API] Google Apps Script returned status ${res.status}. Falling back to local storage.`);
      return runDemoAction(action, payload, getDemoUser());
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.warn('[Adpowrs API] Response was not valid JSON, falling back to local storage.');
      return runDemoAction(action, payload, getDemoUser());
    }

    if (!json.ok) {
      if (json.code === 'UNAUTHORIZED') {
        setAuthToken('');
        try { localStorage.removeItem('adpowrs_user'); } catch (e) {}
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('adpowrs:unauthorized'));
        }
      }
      // Throw GasApiError so callers know this is a real server-side application response, NOT a connection failure!
      throw new GasApiError(json.error || 'Apps Script API error', json.code);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('adpowrs:gas_connected'));
    }

    return json.data;
  } catch (err) {
    // If it's a genuine response from Google Apps Script (e.g. invalid password, session expired, validation)
    // do NOT show the Google Apps Script permissions/deployment warning!
    if (err instanceof GasApiError) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adpowrs:gas_connected'));
      }
      throw err;
    }

    // Truly offline or temporary fetch error (e.g. device woke from sleep, Wi-Fi reconnecting)
    console.warn(`[Adpowrs API] Network or fetch error (${err.message}). Using local store fallback.`);
    return runDemoAction(action, payload, getDemoUser());
  }
}

/**
 * Verifies live connection to Google Apps Script and pushes any unsynced
 * local demoStore records (clients, invoices, expenses) directly into Google Sheets.
 */
export async function syncDataWithGoogleSheets() {
  const apiUrl = getGasApiUrl();
  if (!apiUrl) {
    throw new Error('يرجى ربط رابط Google Apps Script أولاً في صفحة الإعدادات.');
  }

  // 1. Check endpoint health & public reachability
  const testRes = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'health' })
  });

  const contentType = testRes.headers.get('content-type') || '';
  const text = await testRes.text();
  const isHtml = contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html');

  if (!testRes.ok || isHtml) {
    throw new Error('تعذر الوصول إلى Google Apps Script: يرجى التأكد في Apps Script من (1) تشغيل setupAdpowrsERP والموافقة على الأذونات، و (2) ضبط Execute as = Me و Who has access = Anyone في Deploy.');
  }

  // 2. Check user session
  const token = getAuthToken();
  if (!token) {
    throw new Error('يرجى تسجيل الدخول أولاً (admin@adpowrs.com / Admin@2026) قبل مزامنة البيانات مع Google Sheets.');
  }

  const authRes = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'getSettings', token })
  });
  const authText = await authRes.text();
  let json;
  try {
    json = JSON.parse(authText);
  } catch (e) {
    throw new Error('استجابة غير صالحة من Google Apps Script.');
  }

  if (!json.ok) {
    if (json.code === 'UNAUTHORIZED') {
      throw new Error('جلسة الدخول منتهية. يرجى تسجيل الدخول مجدداً (admin@adpowrs.com / Admin@2026) لمزامنة Google Sheets.');
    }
    throw new Error(json.error || 'فشل الاتصال بـ Google Apps Script');
  }

  // Push local records if any exist
  let localDb = null;
  try {
    const raw = localStorage.getItem('adpowrs_demo_db_v2');
    if (raw) localDb = JSON.parse(raw);
  } catch (e) {}

  let pushedCount = 0;
  if (localDb) {
    if (Array.isArray(localDb.clients) && localDb.clients.length > 0) {
      for (const cl of localDb.clients) {
        try {
          await gasCall('saveClient', cl);
          pushedCount++;
        } catch (e) {}
      }
    }
    if (Array.isArray(localDb.invoices) && localDb.invoices.length > 0) {
      for (const inv of localDb.invoices) {
        try {
          await gasCall('saveInvoice', { ...inv, id: undefined, finalize: true });
          pushedCount++;
        } catch (e) {}
      }
    }
    if (Array.isArray(localDb.expenses) && localDb.expenses.length > 0) {
      for (const exp of localDb.expenses) {
        try {
          await gasCall('saveExpense', { ...exp, id: undefined });
          pushedCount++;
        } catch (e) {}
      }
    }
    if (Array.isArray(localDb.suppliers) && localDb.suppliers.length > 0) {
      for (const sup of localDb.suppliers) {
        try {
          await gasCall('saveSupplier', { ...sup, id: undefined });
          pushedCount++;
        } catch (e) {}
      }
    }
    if (Array.isArray(localDb.supplierBills) && localDb.supplierBills.length > 0) {
      for (const bill of localDb.supplierBills) {
        try {
          await gasCall('saveSupplierBill', { ...bill, id: undefined });
          pushedCount++;
        } catch (e) {}
      }
    }
  }

  return { ok: true, pushedCount, settings: json.data?.settings };
}
