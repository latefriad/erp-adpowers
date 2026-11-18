import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

function getSystemScheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredScheme() {
  try {
    const v = localStorage.getItem('color-scheme');
    return v === 'dark' || v === 'light' ? v : null;
  } catch (e) {
    return null;
  }
}

function applyMetaScheme(stored) {
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.content = stored || 'light dark';
}

export function ThemeProvider({ children }) {
  // null = follow system ('light dark'), 'light', or 'dark'
  const [storedScheme, setStoredScheme] = useState(() => readStoredScheme());
  const [systemScheme, setSystemScheme] = useState(() => getSystemScheme());

  const resolvedScheme = storedScheme || systemScheme;

  useEffect(() => {
    applyMetaScheme(storedScheme);
  }, [storedScheme]);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      // Never retroactively clear stored override when OS changes
      setSystemScheme(e.matches ? 'dark' : 'light');
    };
    const onStorage = (e) => {
      if (e.key === 'color-scheme') {
        setStoredScheme(readStoredScheme());
      }
    };
    mql.addEventListener('change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Two-state quick toggle per modern-web-guidance:
  // If target matches current system preference, remove stored override so site follows OS again.
  const toggleTheme = () => {
    const target = resolvedScheme === 'dark' ? 'light' : 'dark';
    const currentSys = getSystemScheme();
    if (target === currentSys) {
      try { localStorage.removeItem('color-scheme'); } catch (e) {}
      setStoredScheme(null);
    } else {
      try { localStorage.setItem('color-scheme', target); } catch (e) {}
      setStoredScheme(target);
    }
  };

  // Explicit 3-state selector for Settings page ('system' | 'light' | 'dark')
  const setSchemePreference = (pref) => {
    if (pref === 'system') {
      try { localStorage.removeItem('color-scheme'); } catch (e) {}
      setStoredScheme(null);
    } else if (pref === 'light' || pref === 'dark') {
      try { localStorage.setItem('color-scheme', pref); } catch (e) {}
      setStoredScheme(pref);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        schemePreference: storedScheme || 'system',
        resolvedScheme,
        systemScheme,
        isDark: resolvedScheme === 'dark',
        toggleTheme,
        setSchemePreference
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
