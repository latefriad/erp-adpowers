import { runDemoAction } from './demoStore';

const GAS_URL_KEY = 'adpowrs_gas_url';
const TOKEN_KEY = 'adpowrs_token';

export function getGasApiUrl() {
  try {
    const custom = localStorage.getItem(GAS_URL_KEY);
    if (custom && custom.trim()) return custom.trim();
  } catch (e) {}
  return (import.meta.env.VITE_GAS_API_URL || '').trim();
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

    // Check if Google returned an HTML page (e.g. 403 Forbidden / "Une autorisation est nécessaire")
    const isHtml = contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html');

    if (!res.ok || isHtml) {
      console.warn(`[Adpowrs API] Google Apps Script returned status ${res.status} or HTML. Falling back to local storage.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adpowrs:gas_auth_warning', {
          detail: { status: res.status, url: apiUrl }
        }));
      }
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('adpowrs:unauthorized'));
        }
      }
      throw new Error(json.error || 'Apps Script API error');
    }

    return json.data;
  } catch (err) {
    // If network error (CORS, offline, DNS, or blocked fetch)
    if (err.message && !err.message.includes('Apps Script API error')) {
      console.warn(`[Adpowrs API] Network failure (${err.message}). Using local store fallback.`);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adpowrs:gas_auth_warning', {
          detail: { message: err.message, url: apiUrl }
        }));
      }
      return runDemoAction(action, payload, getDemoUser());
    }
    throw err;
  }
}
