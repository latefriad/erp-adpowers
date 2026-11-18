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
 * If no GAS URL is configured yet, runs transparently against the local Demo store.
 */
export async function gasCall(action, payload = {}, opts = {}) {
  const apiUrl = getGasApiUrl();
  const token = opts.skipAuth ? '' : getAuthToken();

  if (!apiUrl) {
    let demoUser = null;
    try {
      const saved = localStorage.getItem('adpowrs_user');
      if (saved) demoUser = JSON.parse(saved);
    } catch (e) {}
    return runDemoAction(action, payload, demoUser);
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token, payload })
  });

  if (!res.ok) {
    throw new Error(`Network error (${res.status}) while calling Google Apps Script`);
  }

  const json = await res.json();
  if (!json.ok) {
    if (json.code === 'UNAUTHORIZED') {
      setAuthToken('');
      window.dispatchEvent(new CustomEvent('adpowrs:unauthorized'));
    }
    throw new Error(json.error || 'Apps Script API error');
  }

  return json.data;
}
