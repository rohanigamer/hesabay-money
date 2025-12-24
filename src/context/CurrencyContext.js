import React, { createContext, useState, useEffect, useContext } from 'react';
import { Storage } from '../utils/Storage';
import { getCurrencySymbol, formatCurrency, formatCurrencyWithSign, DEFAULT_CURRENCY } from '../utils/Currency';

export const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    try {
      const savedCurrency = await Storage.getCurrency();
      setCurrencyState(savedCurrency || DEFAULT_CURRENCY);
    } catch (error) {
      console.error('Error loading currency:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeCurrency = async (newCurrency) => {
    await Storage.setCurrency(newCurrency);
    setCurrencyState(newCurrency);
  };

  const getSymbol = () => getCurrencySymbol(currency);

  const format = (amount) => formatCurrency(amount, currency);

  const formatWithSign = (amount) => formatCurrencyWithSign(amount, currency);

  return (
    <CurrencyContext.Provider 
      value={{ 
        currency, 
        changeCurrency, 
        isLoading,
        getSymbol,
        format,
        formatWithSign,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);

