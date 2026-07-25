import React, { createContext, useContext } from 'react';
import { useUser } from './UserContext';
import translations from '../shared/lib/i18n';

const LanguageContext = createContext({
  t: (key) => key,
  lang: 'es',
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const { user } = useUser();
  const lang = user.language || 'es';
  const dict = translations[lang] || translations.es;

  const t = (path) => {
    const keys = path.split('.');
    let value = dict;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return path;
      }
    }
    return typeof value === 'string' ? value : path;
  };

  return (
    <LanguageContext.Provider value={{ t, lang }}>
      {children}
    </LanguageContext.Provider>
  );
}
