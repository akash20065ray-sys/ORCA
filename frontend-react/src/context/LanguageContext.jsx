import React, { createContext, useContext, useState, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, TRANSLATIONS, translate, walkAndTranslateDOM } from '../translations/translations';

const LanguageContext = createContext({
  currentLang: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  languages: SUPPORTED_LANGUAGES,
  currentLanguageInfo: SUPPORTED_LANGUAGES[0],
});

export function LanguageProvider({ children }) {
  const [currentLang, setCurrentLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('orca_app_language');
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = (newCode) => {
    if (!newCode) return;
    const valid = SUPPORTED_LANGUAGES.some((l) => l.code === newCode);
    const codeToSet = valid ? newCode : 'en';
    setCurrentLangState(codeToSet);
    try {
      localStorage.setItem('orca_app_language', codeToSet);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = codeToSet;
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = currentLang;

    // Run deep universal DOM translation pass
    walkAndTranslateDOM(document.body, currentLang);

    // Setup MutationObserver to continuously translate dynamic React updates
    let isTranslating = false;
    let timer = null;

    const observer = new MutationObserver(() => {
      if (isTranslating) return;
      if (currentLang === 'en') return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        isTranslating = true;
        try {
          walkAndTranslateDOM(document.body, currentLang);
        } finally {
          setTimeout(() => {
            isTranslating = false;
          }, 40);
        }
      }, 60);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [currentLang]);

  const t = (key, fallback = '') => {
    return translate(key, currentLang, fallback);
  };

  const currentLanguageInfo =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        currentLang,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageInfo,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      currentLang: 'en',
      setLanguage: () => {},
      t: (key, fallback) => fallback || key,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageInfo: SUPPORTED_LANGUAGES[0],
    };
  }
  return context;
}
