import { createContext, useContext, useEffect, useState } from 'react';
import { gasCall, getAuthToken, isDemoMode, setAuthToken } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('adpowrs_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });
  const [settings, setSettings] = useState({ agencyName: 'Adpowrs Digital', primaryColor: '#6366f1', defaultCurrency: 'DZD', defaultTaxRate: 19 });
  const [loading, setLoading] = useState(true);

  const applyBrandColors = (s) => {
    if (!s) return;
    if (s.primaryColor) document.documentElement.style.setProperty('--brand-primary', s.primaryColor);
    if (s.secondaryColor) document.documentElement.style.setProperty('--brand-secondary', s.secondaryColor);
  };

  useEffect(() => {
    let active = true;
    async function init() {
      const token = getAuthToken();
      if (!token && !isDemoMode()) {
        setLoading(false);
        return;
      }
      try {
        if (!token && isDemoMode()) {
          // Auto-login Admin in Demo Mode for instant preview
          const res = await gasCall('login', { email: 'admin@adpowrs.com', password: 'demo' }, { skipAuth: true });
          if (!active) return;
          setAuthToken(res.token);
          setUser(res.user);
          localStorage.setItem('adpowrs_user', JSON.stringify(res.user));
          setSettings(res.settings);
          applyBrandColors(res.settings);
        } else {
          const res = await gasCall('me');
          if (!active) return;
          setUser(res.user);
          localStorage.setItem('adpowrs_user', JSON.stringify(res.user));
          setSettings(res.settings);
          applyBrandColors(res.settings);
        }
      } catch (e) {
        setUser(null);
        setAuthToken('');
      } finally {
        if (active) setLoading(false);
      }
    }
    init();

    const onUnauth = () => {
      setUser(null);
      localStorage.removeItem('adpowrs_user');
    };
    window.addEventListener('adpowrs:unauthorized', onUnauth);
    return () => {
      active = false;
      window.removeEventListener('adpowrs:unauthorized', onUnauth);
    };
  }, []);

  const login = async (email, password) => {
    const res = await gasCall('login', { email, password }, { skipAuth: true });
    setAuthToken(res.token);
    setUser(res.user);
    localStorage.setItem('adpowrs_user', JSON.stringify(res.user));
    setSettings(res.settings);
    applyBrandColors(res.settings);
    return res.user;
  };

  const logout = async () => {
    try { await gasCall('logout'); } catch (e) {}
    setAuthToken('');
    localStorage.removeItem('adpowrs_user');
    setUser(null);
  };

  const refreshSettings = (next) => {
    setSettings(next);
    applyBrandColors(next);
  };

  return (
    <AuthContext.Provider value={{ user, settings, loading, login, logout, refreshSettings, demoMode: isDemoMode() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
