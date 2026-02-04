import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENCIES, DEFAULT_CURRENCY } from './Currency';

// Use AsyncStorage for web, SecureStore for native
const storage = {
  async getItemAsync(key) {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.log('Storage get error:', error);
      return null;
    }
  },
  async setItemAsync(key, value) {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.log('Storage set error:', error);
    }
  },
  async deleteItemAsync(key) {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.log('Storage delete error:', error);
    }
  },
};

// Get current user ID (set by AuthContext)
let currentUserId = 'guest-user';

// Sync callback (set by FirebaseSync)
let onDataChange = null;

export const setCurrentUserId = (userId) => {
  currentUserId = userId || 'guest-user';
};

export const getCurrentUserId = () => {
  return currentUserId;
};

export const setOnDataChange = (callback) => {
  onDataChange = callback;
};

// Trigger sync after data changes
const triggerSync = () => {
  if (onDataChange && currentUserId !== 'guest-user') {
    // Delay sync slightly to batch multiple changes
    setTimeout(() => {
      onDataChange();
    }, 1000);
  }
};

// User-specific storage keys
const getUserKey = (key) => {
  return `${currentUserId}_${key}`;
};

const STORAGE_KEYS = {
  PASSCODE: 'app_passcode',
  AUTH_METHOD: 'auth_method',
  GUEST_MODE: 'app_guest_mode',
  THEME: 'app_theme',
  LANGUAGE: 'app_language',
  CURRENCY: 'app_currency',
  CURRENCY_WALLETS: 'currency_wallets',
  EXCHANGE_RATES: 'exchange_rates',
  APP_DATA: 'app_data',
  CUSTOMERS: 'customers',
  TRANSACTIONS: 'transactions',
};

const MAX_WALLETS = 3;

export const Storage = {
  // Passcode
  async getPasscode() {
    try {
      return await storage.getItemAsync(STORAGE_KEYS.PASSCODE);
    } catch (error) {
      console.error('Error getting passcode:', error);
      return null;
    }
  },

  async setPasscode(passcode) {
    try {
      await storage.setItemAsync(STORAGE_KEYS.PASSCODE, passcode);
      return true;
    } catch (error) {
      console.error('Error setting passcode:', error);
      return false;
    }
  },

  async deletePasscode() {
    try {
      await storage.deleteItemAsync(STORAGE_KEYS.PASSCODE);
      return true;
    } catch (error) {
      console.error('Error deleting passcode:', error);
      return false;
    }
  },

  // Guest mode (persist so app reopens as guest)
  async getGuestMode() {
    try {
      const value = await storage.getItemAsync(STORAGE_KEYS.GUEST_MODE);
      return value === 'true';
    } catch (error) {
      return false;
    }
  },

  async setGuestMode(enabled) {
    try {
      await storage.setItemAsync(STORAGE_KEYS.GUEST_MODE, enabled ? 'true' : 'false');
      return true;
    } catch (error) {
      return false;
    }
  },

  async clearGuestMode() {
    try {
      await storage.deleteItemAsync(STORAGE_KEYS.GUEST_MODE);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Auth Method
  async getAuthMethod() {
    try {
      const method = await storage.getItemAsync(STORAGE_KEYS.AUTH_METHOD);
      return method || 'none';
    } catch (error) {
      console.error('Error getting auth method:', error);
      return 'none';
    }
  },

  async setAuthMethod(method) {
    try {
      await storage.setItemAsync(STORAGE_KEYS.AUTH_METHOD, method);
      return true;
    } catch (error) {
      console.error('Error setting auth method:', error);
      return false;
    }
  },

  // Theme
  async getTheme() {
    try {
      const theme = await storage.getItemAsync(STORAGE_KEYS.THEME);
      return theme || 'dark';
    } catch (error) {
      console.error('Error getting theme:', error);
      return 'dark';
    }
  },

  async setTheme(theme) {
    try {
      await storage.setItemAsync(STORAGE_KEYS.THEME, theme);
      return true;
    } catch (error) {
      console.error('Error setting theme:', error);
      return false;
    }
  },

  // Language
  async getLanguage() {
    try {
      const lang = await storage.getItemAsync(STORAGE_KEYS.LANGUAGE);
      return lang || 'en';
    } catch (error) {
      console.error('Error getting language:', error);
      return 'en';
    }
  },

  async setLanguage(language) {
    try {
      await storage.setItemAsync(STORAGE_KEYS.LANGUAGE, language);
      return true;
    } catch (error) {
      console.error('Error setting language:', error);
      return false;
    }
  },

  // Currency
  async getCurrency() {
    try {
      const currency = await storage.getItemAsync(STORAGE_KEYS.CURRENCY);
      return currency || 'USD';
    } catch (error) {
      console.error('Error getting currency:', error);
      return 'USD';
    }
  },

  async setCurrency(currency) {
    try {
      await storage.setItemAsync(STORAGE_KEYS.CURRENCY, currency);
      return true;
    } catch (error) {
      console.error('Error setting currency:', error);
      return false;
    }
  },

  // Wallets (up to 3 currencies with separate balances)
  async getWallets() {
    try {
      const key = getUserKey(STORAGE_KEYS.CURRENCY_WALLETS);
      const raw = await storage.getItemAsync(key);
      let wallets = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(wallets)) wallets = [];

      if (wallets.length === 0) {
        const currency = await this.getCurrency();
        const stats = await this.getStats();
        const transactions = await this.getTransactions();
        const primaryCode = currency || DEFAULT_CURRENCY;
        const wallet = {
          id: Date.now().toString(),
          currencyCode: primaryCode,
          initialBalance: parseFloat(stats.totalBalance) || 0,
        };
        wallets = [wallet];
        await this.saveWallets(wallets);
        if (transactions.length > 0) {
          const updated = transactions.map(t => ({ ...t, currencyCode: t.currencyCode || primaryCode }));
          await this.saveTransactions(updated);
        }
      }

      return wallets;
    } catch (error) {
      console.error('Error getting wallets:', error);
      return [];
    }
  },

  async saveWallets(wallets) {
    try {
      const key = getUserKey(STORAGE_KEYS.CURRENCY_WALLETS);
      await storage.setItemAsync(key, JSON.stringify(wallets));
      triggerSync();
      return true;
    } catch (error) {
      console.error('Error saving wallets:', error);
      return false;
    }
  },

  async addWallet({ currencyCode, initialBalance }) {
    try {
      const code = (currencyCode || '').trim().toUpperCase();
      if (!CURRENCIES.some(c => c.code === code)) {
        return { success: false, error: 'Invalid currency code.' };
      }
      const wallets = await this.getWallets();
      if (wallets.some(w => w.currencyCode === code)) {
        return { success: false, error: 'This currency is already added.' };
      }
      if (wallets.length >= MAX_WALLETS) {
        return { success: false, error: 'You can add up to 3 currencies.' };
      }
      const num = parseFloat(initialBalance);
      if (Number.isNaN(num)) {
        return { success: false, error: 'Enter a valid number.' };
      }
      const wallet = {
        id: Date.now().toString(),
        currencyCode: code,
        initialBalance: num,
      };
      wallets.push(wallet);
      await this.saveWallets(wallets);
      return { success: true, wallet };
    } catch (error) {
      console.error('Error adding wallet:', error);
      return { success: false, error: error.message || 'Could not add currency.' };
    }
  },

  async updateWallet(id, { initialBalance }) {
    try {
      const wallets = await this.getWallets();
      const index = wallets.findIndex(w => w.id === id);
      if (index === -1) return { success: false, error: 'Wallet not found.' };
      const num = parseFloat(initialBalance);
      if (Number.isNaN(num)) {
        return { success: false, error: 'Enter a valid number.' };
      }
      wallets[index] = { ...wallets[index], initialBalance: num };
      await this.saveWallets(wallets);
      return { success: true };
    } catch (error) {
      console.error('Error updating wallet:', error);
      return { success: false, error: error.message || 'Could not update.' };
    }
  },

  async removeWallet(id) {
    try {
      const wallets = await this.getWallets();
      const wallet = wallets.find(w => w.id === id);
      if (!wallet) return { success: false, error: 'Wallet not found.', transactionCount: 0 };
      const transactions = await this.getTransactions();
      const count = transactions.filter(t => (t.currencyCode || '').toUpperCase() === wallet.currencyCode).length;
      if (count > 0) {
        return { success: false, error: `Cannot remove: ${count} transaction(s) use this currency.`, transactionCount: count };
      }
      const next = wallets.filter(w => w.id !== id);
      await this.saveWallets(next);
      return { success: true };
    } catch (error) {
      console.error('Error removing wallet:', error);
      return { success: false, error: error.message || 'Could not remove.', transactionCount: 0 };
    }
  },

  async getStatsPerCurrency() {
    try {
      const transactions = await this.getTransactions();
      const byCode = {};
      transactions.forEach(t => {
        const code = (t.currencyCode || DEFAULT_CURRENCY).toUpperCase();
        if (!byCode[code]) byCode[code] = { totalIncome: 0, totalExpenses: 0 };
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'credit' || t.type === 'income') byCode[code].totalIncome += amount;
        else if (t.type === 'debit' || t.type === 'expense') byCode[code].totalExpenses += amount;
      });
      Object.keys(byCode).forEach(code => {
        byCode[code].totalBalance = byCode[code].totalIncome - byCode[code].totalExpenses;
      });
      return byCode;
    } catch (error) {
      console.error('Error getting stats per currency:', error);
      return {};
    }
  },

  async getWalletBalances() {
    try {
      const [wallets, statsPer] = await Promise.all([this.getWallets(), this.getStatsPerCurrency()]);
      return wallets.map(w => {
        const stats = statsPer[w.currencyCode] || { totalIncome: 0, totalExpenses: 0, totalBalance: 0 };
        const balance = (parseFloat(w.initialBalance) || 0) + stats.totalBalance;
        return { ...w, balance };
      });
    } catch (error) {
      console.error('Error getting wallet balances:', error);
      return [];
    }
  },

  // Exchange rates: { baseCurrency: 'USD', rates: { AFN: 70, EUR: 0.92 } } = 1 base = X of each
  async getExchangeRates() {
    try {
      const key = getUserKey(STORAGE_KEYS.EXCHANGE_RATES);
      const raw = await storage.getItemAsync(key);
      if (!raw) return { baseCurrency: DEFAULT_CURRENCY, rates: {} };
      const data = JSON.parse(raw);
      return {
        baseCurrency: (data.baseCurrency || DEFAULT_CURRENCY).toUpperCase(),
        rates: typeof data.rates === 'object' && data.rates ? data.rates : {},
      };
    } catch (error) {
      console.error('Error getting exchange rates:', error);
      return { baseCurrency: DEFAULT_CURRENCY, rates: {} };
    }
  },

  async saveExchangeRates({ baseCurrency, rates }) {
    try {
      const key = getUserKey(STORAGE_KEYS.EXCHANGE_RATES);
      const base = (baseCurrency || DEFAULT_CURRENCY).toUpperCase();
      const normalized = {};
      if (rates && typeof rates === 'object') {
        Object.entries(rates).forEach(([code, val]) => {
          const num = parseFloat(val);
          if (code && code.toUpperCase() !== base && !Number.isNaN(num) && num > 0) {
            normalized[code.toUpperCase()] = num;
          }
        });
      }
      await storage.setItemAsync(key, JSON.stringify({ baseCurrency: base, rates: normalized }));
      triggerSync();
      return true;
    } catch (error) {
      console.error('Error saving exchange rates:', error);
      return false;
    }
  },

  // App Data (for backup/restore)
  async getAppData() {
    try {
      const data = await storage.getItemAsync(STORAGE_KEYS.APP_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting app data:', error);
      return null;
    }
  },

  async setAppData(data) {
    try {
      await storage.setItemAsync(STORAGE_KEYS.APP_DATA, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error setting app data:', error);
      return false;
    }
  },

  // Customers (user-specific)
  async getCustomers() {
    try {
      const key = getUserKey(STORAGE_KEYS.CUSTOMERS);
      const customers = await storage.getItemAsync(key);
      return customers ? JSON.parse(customers) : [];
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  },

  async saveCustomers(customers) {
    try {
      const key = getUserKey(STORAGE_KEYS.CUSTOMERS);
      await storage.setItemAsync(key, JSON.stringify(customers));
      triggerSync(); // Sync to Firebase
      return true;
    } catch (error) {
      console.error('Error saving customers:', error);
      return false;
    }
  },

  async addCustomer(customer) {
    try {
      const customers = await this.getCustomers();
      const newCustomer = {
        id: Date.now().toString(),
        ...customer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      customers.push(newCustomer);
      await this.saveCustomers(customers);
      return newCustomer;
    } catch (error) {
      console.error('Error adding customer:', error);
      return null;
    }
  },

  async updateCustomer(customerId, updates) {
    try {
      const customers = await this.getCustomers();
      const index = customers.findIndex(c => c.id === customerId);
      if (index !== -1) {
        customers[index] = {
          ...customers[index],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        await this.saveCustomers(customers);
        return customers[index];
      }
      return null;
    } catch (error) {
      console.error('Error updating customer:', error);
      return null;
    }
  },

  async deleteCustomer(customerId) {
    try {
      const customers = await this.getCustomers();
      const filtered = customers.filter(c => c.id !== customerId);
      await this.saveCustomers(filtered);
      // Also delete related transactions
      const transactions = await this.getTransactions();
      const filteredTransactions = transactions.filter(t => t.customerId !== customerId);
      await this.saveTransactions(filteredTransactions);
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  },

  // Transactions
  async getTransactions() {
    try {
      const key = getUserKey(STORAGE_KEYS.TRANSACTIONS);
      const transactions = await storage.getItemAsync(key);
      return transactions ? JSON.parse(transactions) : [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },

  async saveTransactions(transactions) {
    try {
      const key = getUserKey(STORAGE_KEYS.TRANSACTIONS);
      await storage.setItemAsync(key, JSON.stringify(transactions));
      triggerSync(); // Sync to Firebase
      return true;
    } catch (error) {
      console.error('Error saving transactions:', error);
      return false;
    }
  },

  async addTransaction(transaction) {
    try {
      const [transactions, wallets] = await Promise.all([this.getTransactions(), this.getWallets()]);
      const primaryCode = wallets.length > 0 ? wallets[0].currencyCode : DEFAULT_CURRENCY;
      const currencyCode = (transaction.currencyCode || primaryCode).toString().toUpperCase();
      const newTransaction = {
        id: Date.now().toString(),
        ...transaction,
        currencyCode,
        createdAt: new Date().toISOString(),
      };
      transactions.unshift(newTransaction);
      await this.saveTransactions(transactions);

      // Update customer balance if linked
      if (transaction.customerId) {
        const customers = await this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === transaction.customerId);
        if (customerIndex !== -1) {
          const amount = parseFloat(transaction.amount) || 0;
          const currentBalance = parseFloat(customers[customerIndex].balance) || 0;
          
          if (transaction.type === 'credit' || transaction.type === 'income') {
            customers[customerIndex].balance = currentBalance + amount;
          } else if (transaction.type === 'debit' || transaction.type === 'expense') {
            customers[customerIndex].balance = currentBalance - amount;
          }
          
          customers[customerIndex].updatedAt = new Date().toISOString();
          await this.saveCustomers(customers);
        }
      }

      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      return null;
    }
  },

  async getCustomerTransactions(customerId) {
    try {
      const transactions = await this.getTransactions();
      return transactions.filter(t => t.customerId === customerId);
    } catch (error) {
      console.error('Error getting customer transactions:', error);
      return [];
    }
  },

  async updateTransaction(transactionId, updates) {
    try {
      const transactions = await this.getTransactions();
      const transactionIndex = transactions.findIndex(t => t.id === transactionId);
      
      if (transactionIndex === -1) return false;
      
      const oldTransaction = transactions[transactionIndex];
      
      // Reverse old balance changes if customer was linked
      if (oldTransaction.customerId) {
        const customers = await this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === oldTransaction.customerId);
        if (customerIndex !== -1) {
          const amount = parseFloat(oldTransaction.amount) || 0;
          const currentBalance = parseFloat(customers[customerIndex].balance) || 0;
          
          if (oldTransaction.type === 'credit' || oldTransaction.type === 'income') {
            customers[customerIndex].balance = currentBalance - amount;
          } else if (oldTransaction.type === 'debit' || oldTransaction.type === 'expense') {
            customers[customerIndex].balance = currentBalance + amount;
          }
          
          customers[customerIndex].updatedAt = new Date().toISOString();
          await this.saveCustomers(customers);
        }
      }
      
      // Update transaction
      transactions[transactionIndex] = {
        ...oldTransaction,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await this.saveTransactions(transactions);
      
      // Apply new balance changes if customer is linked
      if (updates.customerId) {
        const customers = await this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === updates.customerId);
        if (customerIndex !== -1) {
          const amount = parseFloat(updates.amount) || 0;
          const currentBalance = parseFloat(customers[customerIndex].balance) || 0;
          
          if (updates.type === 'credit' || updates.type === 'income') {
            customers[customerIndex].balance = currentBalance + amount;
          } else if (updates.type === 'debit' || updates.type === 'expense') {
            customers[customerIndex].balance = currentBalance - amount;
          }
          
          customers[customerIndex].updatedAt = new Date().toISOString();
          await this.saveCustomers(customers);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return false;
    }
  },

  // Clear all transactions (local). Resets customer balances. Caller should sync to cloud after.
  async clearAllTransactions() {
    try {
      const customers = await this.getCustomers();
      const updated = customers.map(c => ({ ...c, balance: 0, updatedAt: new Date().toISOString() }));
      await this.saveCustomers(updated);
      await this.saveTransactions([]);
      return true;
    } catch (error) {
      console.error('Error clearing transactions:', error);
      return false;
    }
  },

  async deleteTransaction(transactionId) {
    try {
      const transactions = await this.getTransactions();
      const transaction = transactions.find(t => t.id === transactionId);
      
      if (transaction && transaction.customerId) {
        // Reverse the balance change
        const customers = await this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === transaction.customerId);
        if (customerIndex !== -1) {
          const amount = parseFloat(transaction.amount) || 0;
          const currentBalance = parseFloat(customers[customerIndex].balance) || 0;
          
          if (transaction.type === 'credit' || transaction.type === 'income') {
            customers[customerIndex].balance = currentBalance - amount;
          } else if (transaction.type === 'debit' || transaction.type === 'expense') {
            customers[customerIndex].balance = currentBalance + amount;
          }
          
          customers[customerIndex].updatedAt = new Date().toISOString();
          await this.saveCustomers(customers);
        }
      }
      
      const filtered = transactions.filter(t => t.id !== transactionId);
      await this.saveTransactions(filtered);
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  },

  // Get total stats
  async getStats() {
    try {
      const transactions = await this.getTransactions();
      const customers = await this.getCustomers();
      
      let totalIncome = 0;
      let totalExpenses = 0;
      
      transactions.forEach(t => {
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'credit' || t.type === 'income') {
          totalIncome += amount;
        } else if (t.type === 'debit' || t.type === 'expense') {
          totalExpenses += amount;
        }
      });
      
      let totalCustomerBalance = 0;
      customers.forEach(c => {
        totalCustomerBalance += parseFloat(c.balance) || 0;
      });
      
      return {
        totalIncome,
        totalExpenses,
        totalBalance: totalIncome - totalExpenses,
        totalCustomerBalance,
        totalCustomers: customers.length,
        totalTransactions: transactions.length,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        totalBalance: 0,
        totalCustomerBalance: 0,
        totalCustomers: 0,
        totalTransactions: 0,
      };
    }
  },

  // Backup: export all app data as JSON for .Mbackup file
  async exportBackup() {
    try {
      const [customers, transactions, wallets, theme, currency, language, exchangeRates] = await Promise.all([
        this.getCustomers(),
        this.getTransactions(),
        this.getWallets(),
        this.getTheme(),
        this.getCurrency(),
        this.getLanguage(),
        this.getExchangeRates(),
      ]);
      const payload = {
        version: 2,
        app: 'HesabayMoney',
        exportedAt: new Date().toISOString(),
        customers: customers || [],
        transactions: transactions || [],
        wallets: wallets || [],
        theme: theme || 'light',
        currency: currency || 'USD',
        language: language || 'en',
        exchangeRates: exchangeRates || { baseCurrency: 'USD', rates: {} },
      };
      return JSON.stringify(payload, null, 0);
    } catch (error) {
      console.error('Export backup error:', error);
      return null;
    }
  },

  // Import: restore from .Mbackup file content (JSON string)
  async importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data.app !== 'string' || !Array.isArray(data.customers) || !Array.isArray(data.transactions)) {
        return { success: false, error: 'Invalid backup file format.' };
      }
      let transactions = data.transactions || [];
      let wallets = Array.isArray(data.wallets) ? data.wallets : [];
      if (wallets.length > MAX_WALLETS) {
        wallets = wallets.slice(0, MAX_WALLETS);
      }
      const validCodes = new Set(CURRENCIES.map(c => c.code));
      wallets = wallets.filter(w => w && w.currencyCode && validCodes.has(w.currencyCode));
      if (wallets.length === 0 && (data.currency || data.theme !== undefined)) {
        const code = data.currency || DEFAULT_CURRENCY;
        const primaryCode = validCodes.has(code) ? code : DEFAULT_CURRENCY;
        wallets = [{ id: Date.now().toString(), currencyCode: primaryCode, initialBalance: 0 }];
        transactions = transactions.map(t => ({ ...t, currencyCode: t.currencyCode || primaryCode }));
      } else if (wallets.length > 0) {
        const primaryCode = wallets[0].currencyCode;
        transactions = transactions.map(t => ({ ...t, currencyCode: t.currencyCode || primaryCode }));
      }
      await this.saveCustomers(data.customers || []);
      await this.saveTransactions(transactions);
      await this.saveWallets(wallets);
      if (data.theme) await this.setTheme(data.theme);
      if (data.currency) await this.setCurrency(data.currency);
      if (data.language) await this.setLanguage(data.language);
      if (data.exchangeRates && data.exchangeRates.baseCurrency) {
        await this.saveExchangeRates({ baseCurrency: data.exchangeRates.baseCurrency, rates: data.exchangeRates.rates || {} });
      }
      return { success: true, customers: (data.customers || []).length, transactions: transactions.length };
    } catch (error) {
      console.error('Import backup error:', error);
      return { success: false, error: error.message || 'Invalid or corrupted backup file.' };
    }
  },
};
