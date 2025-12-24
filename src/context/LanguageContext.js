import React, { createContext, useState, useEffect, useContext } from 'react';
import { Storage } from '../utils/Storage';
import { setLanguage as setI18nLanguage, getLanguage as getI18nLanguage } from '../utils/i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await Storage.getLanguage();
      const lang = savedLang || 'en';
      setLanguage(lang);
      await setI18nLanguage(lang);
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (lang) => {
    await setI18nLanguage(lang);
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

