import { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('adpowrs_lang');
      return ['ar', 'fr', 'en'].includes(saved) ? saved : 'ar';
    } catch (e) {
      return 'ar';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('adpowrs_lang', lang);
    } catch (e) {}
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const dict = translations[lang] || translations.ar;
  const t = (path, fallback) => {
    const parts = path.split('.');
    let cur = dict;
    for (const p of parts) {
      cur = cur?.[p];
      if (cur === undefined) return fallback ?? path;
    }
    return cur;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir: lang === 'ar' ? 'rtl' : 'ltr', t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
