import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { Storage } from '../utils/Storage';
import { getCurrencySymbol, formatCurrency, formatCurrencyWithSign, DEFAULT_CURRENCY } from '../utils/Currency';

export const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [walletBalances, setWalletBalances] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({ baseCurrency: DEFAULT_CURRENCY, rates: {} });
  const [isLoading, setIsLoading] = useState(true);

  const primaryCurrency = (wallets.length > 0 ? wallets[0].currencyCode : null) || DEFAULT_CURRENCY;

  const loadWallets = useCallback(async () => {
    try {
      const list = await Storage.getWallets();
      setWallets(list);
      const balances = await Storage.getWalletBalances();
      setWalletBalances(balances);
    } catch (error) {
      console.error('Error loading wallets:', error);
      setWallets([]);
      setWalletBalances([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadExchangeRates = useCallback(async () => {
    try {
      const rates = await Storage.getExchangeRates();
      setExchangeRates(rates);
    } catch (e) {
      console.error('Error loading exchange rates:', e);
    }
  }, []);

  useEffect(() => {
    loadExchangeRates();
  }, [loadExchangeRates]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const addWallet = useCallback(async ({ currencyCode, initialBalance }) => {
    try {
      const result = await Storage.addWallet({ currencyCode, initialBalance });
      if (result && result.success) await loadWallets();
      return result != null ? result : { success: false, error: 'Could not add currency.' };
    } catch (e) {
      console.error('addWallet error:', e);
      return { success: false, error: e?.message || 'Could not add currency.' };
    }
  }, [loadWallets]);

  const updateWallet = useCallback(async (id, updates) => {
    const result = await Storage.updateWallet(id, updates);
    if (result.success) await loadWallets();
    return result;
  }, [loadWallets]);

  const removeWallet = useCallback(async (id) => {
    const result = await Storage.removeWallet(id);
    if (result.success) await loadWallets();
    return result;
  }, [loadWallets]);

  const refreshBalances = useCallback(async () => {
    try {
      const balances = await Storage.getWalletBalances();
      setWalletBalances(balances);
    } catch (e) {
      console.error('Refresh balances error:', e);
    }
  }, []);

  const getBalanceForCurrency = useCallback((currencyCode) => {
    const code = (currencyCode || '').toUpperCase();
    const item = walletBalances.find(w => (w.currencyCode || '').toUpperCase() === code);
    return item != null ? (parseFloat(item.balance) || 0) : 0;
  }, [walletBalances]);

  const getSymbol = useCallback((currencyCode) => {
    return getCurrencySymbol(currencyCode || primaryCurrency);
  }, [primaryCurrency]);

  const format = useCallback((amount, currencyCode) => {
    return formatCurrency(amount, currencyCode || primaryCurrency);
  }, [primaryCurrency]);

  const formatWithSign = useCallback((amount, currencyCode) => {
    return formatCurrencyWithSign(amount, currencyCode || primaryCurrency);
  }, [primaryCurrency]);

  // Convert amount from one currency to another using stored exchange rates.
  // Rates: 1 baseCurrency = rates[code] of that code. E.g. base USD, rates.AFN = 70 => 1 USD = 70 AFN.
  const convert = useCallback((amount, fromCurrency, toCurrency) => {
    const from = (fromCurrency || '').toUpperCase();
    const to = (toCurrency || '').toUpperCase();
    if (from === to) return parseFloat(amount) || 0;
    const base = (exchangeRates.baseCurrency || DEFAULT_CURRENCY).toUpperCase();
    const rates = exchangeRates.rates || {};
    let inBase;
    if (from === base) {
      inBase = parseFloat(amount) || 0;
    } else if (rates[from] && rates[from] > 0) {
      inBase = (parseFloat(amount) || 0) / rates[from];
    } else {
      return parseFloat(amount) || 0; // no rate, return original
    }
    if (to === base) return inBase;
    if (rates[to] && rates[to] > 0) return inBase * rates[to];
    return inBase;
  }, [exchangeRates]);

  const canConvertTo = useCallback((toCurrency) => {
    const to = (toCurrency || '').toUpperCase();
    const base = (exchangeRates.baseCurrency || DEFAULT_CURRENCY).toUpperCase();
    if (to === base) return true;
    const rates = exchangeRates.rates || {};
    return !!(rates[to] && rates[to] > 0);
  }, [exchangeRates]);

  const canConvertFrom = useCallback((fromCurrency) => {
    const from = (fromCurrency || '').toUpperCase();
    const base = (exchangeRates.baseCurrency || DEFAULT_CURRENCY).toUpperCase();
    if (from === base) return true;
    const rates = exchangeRates.rates || {};
    return !!(rates[from] && rates[from] > 0);
  }, [exchangeRates]);

  return (
    <CurrencyContext.Provider
      value={{
        currency: primaryCurrency,
        wallets,
        walletBalances,
        exchangeRates,
        primaryCurrency,
        isLoading,
        addWallet,
        updateWallet,
        removeWallet,
        loadWallets,
        loadExchangeRates,
        refreshBalances,
        getBalanceForCurrency,
        getSymbol,
        format,
        formatWithSign,
        convert,
        canConvertTo,
        canConvertFrom,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
