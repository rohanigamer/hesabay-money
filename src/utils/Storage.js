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
      console.error('Storage set error:', error);
      throw error;
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

// Collision-safe ID: timestamp + random suffix
const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

  // Currency (default USD when not set)
  async getCurrency() {
    try {
      const currency = await storage.getItemAsync(STORAGE_KEYS.CURRENCY);
      return currency || DEFAULT_CURRENCY;
    } catch (error) {
      console.error('Error getting currency:', error);
      return DEFAULT_CURRENCY;
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

      // Only create a default wallet if storage was truly never written.
      // Check a migration flag to avoid destructive re-migration on transient read failures.
      if (wallets.length === 0) {
        const migrationKey = getUserKey('wallets_initialized');
        const alreadyMigrated = await storage.getItemAsync(migrationKey);
        if (alreadyMigrated === 'true') {
          // Wallets were previously initialized but now read as empty.
          // This is likely a transient storage error — do NOT destroy transactions.
          console.warn('getWallets: wallets read as empty but migration flag exists. Skipping destructive migration.');
          return [];
        }

        const currency = await this.getCurrency();
        const transactions = await this.getTransactions();
        const primaryCode = currency || DEFAULT_CURRENCY;

        // Detect currencies already used in existing transactions to preserve multi-currency data
        const usedCurrencies = new Set();
        transactions.forEach(t => {
          if (t.currencyCode) usedCurrencies.add(t.currencyCode.toUpperCase());
        });

        if (usedCurrencies.size > 0) {
          // Create wallets for each currency already in use (up to MAX_WALLETS)
          wallets = [...usedCurrencies].slice(0, MAX_WALLETS).map(code => ({
            id: generateId(),
            currencyCode: code,
            initialBalance: 0,
          }));
        } else {
          // No transactions — create a single default wallet
          wallets = [{
            id: generateId(),
            currencyCode: primaryCode,
            initialBalance: 0,
          }];
        }

        await this.saveWallets(wallets);
        await storage.setItemAsync(migrationKey, 'true');

        // Only fill in missing currencyCode on transactions — NEVER overwrite existing ones
        if (transactions.length > 0) {
          let needsSave = false;
          const updated = transactions.map(t => {
            if (!t.currencyCode) {
              needsSave = true;
              return { ...t, currencyCode: primaryCode };
            }
            return t;
          });
          if (needsSave) await this.saveTransactions(updated);
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
      // Mark wallets as initialized to prevent destructive migration on future empty reads
      if (wallets && wallets.length > 0) {
        const migrationKey = getUserKey('wallets_initialized');
        await storage.setItemAsync(migrationKey, 'true');
      }
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
      const num = Number.isNaN(parseFloat(initialBalance)) ? 0 : parseFloat(initialBalance);
      const wallet = {
        id: generateId(),
        currencyCode: code,
        initialBalance: num,
      };
      wallets.push(wallet);
      const saved = await this.saveWallets(wallets);
      if (!saved) return { success: false, error: 'Could not save. Please try again.' };
      return { success: true, wallet };
    } catch (error) {
      console.error('Error adding wallet:', error);
      return { success: false, error: error.message || 'Could not add currency.' };
    }
  },

  async updateWallet(id, updates) {
    try {
      const wallets = await this.getWallets();
      const index = wallets.findIndex(w => w.id === id);
      if (index === -1) return { success: false, error: 'Wallet not found.' };
      const wallet = wallets[index];
      let next = { ...wallet };

      if (updates.currencyCode !== undefined) {
        const newCode = (updates.currencyCode || '').toString().toUpperCase();
        if (!CURRENCIES.some(c => c.code === newCode)) {
          return { success: false, error: 'Invalid currency code.' };
        }
        if (newCode === (wallet.currencyCode || '').toUpperCase()) {
          return { success: false, error: 'Same currency selected.' };
        }
        if (wallets.some(w => w.id !== id && (w.currencyCode || '').toUpperCase() === newCode)) {
          return { success: false, error: 'That currency is already added.' };
        }
        const transactions = await this.getTransactions();
        const count = transactions.filter(t => (t.currencyCode || '').toUpperCase() === (wallet.currencyCode || '').toUpperCase()).length;
        if (count > 0) {
          return { success: false, error: `This currency has ${count} transaction(s). Use Remove to convert or delete them first.`, transactionCount: count };
        }
        next.currencyCode = newCode;
      }

      if (updates.initialBalance !== undefined) {
        const num = parseFloat(updates.initialBalance);
        if (Number.isNaN(num)) {
          return { success: false, error: 'Enter a valid number.' };
        }
        next.initialBalance = num;
      }

      wallets[index] = next;
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

  // Convert all transactions from wallet's currency to target currency using rate (1 fromCurrency = rate targetCurrency), then remove wallet.
  async convertTransactionsToCurrencyAndRemoveWallet(walletId, targetCurrencyCode, rate) {
    try {
      const wallets = await this.getWallets();
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) return { success: false, error: 'Wallet not found.' };
      const targetCode = (targetCurrencyCode || '').toUpperCase();
      const fromCode = (wallet.currencyCode || '').toUpperCase();
      if (fromCode === targetCode) return { success: false, error: 'Target currency must be different.' };
      const otherWallet = wallets.find(w => (w.currencyCode || '').toUpperCase() === targetCode);
      if (!otherWallet) return { success: false, error: 'Target currency must be one of your wallets.' };
      const numRate = parseFloat(rate);
      if (Number.isNaN(numRate) || numRate <= 0) return { success: false, error: 'Enter a valid rate (e.g. 0.014 for 1 AFN = 0.014 USD).' };

      const transactions = await this.getTransactions();
      const toConvert = transactions.filter(t => (t.currencyCode || '').toUpperCase() === fromCode);
      for (const t of toConvert) {
        const newAmount = (parseFloat(t.amount) || 0) * numRate;
        await this.updateTransaction(t.id, { amount: newAmount, currencyCode: targetCode });
      }
      const next = wallets.filter(w => w.id !== walletId);
      await this.saveWallets(next);
      return { success: true, convertedCount: toConvert.length };
    } catch (error) {
      console.error('Error converting and removing wallet:', error);
      return { success: false, error: error.message || 'Could not convert.' };
    }
  },

  // Delete all transactions with this wallet's currency and remove the wallet.
  async deleteTransactionsWithCurrencyAndRemoveWallet(walletId) {
    try {
      const wallets = await this.getWallets();
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) return { success: false, error: 'Wallet not found.' };
      const fromCode = (wallet.currencyCode || '').toUpperCase();
      const transactions = await this.getTransactions();
      const toDelete = transactions.filter(t => (t.currencyCode || '').toUpperCase() === fromCode);
      for (const t of toDelete) {
        await this.deleteTransaction(t.id);
      }
      const next = wallets.filter(w => w.id !== walletId);
      await this.saveWallets(next);
      return { success: true, deletedCount: toDelete.length };
    } catch (error) {
      console.error('Error deleting transactions and removing wallet:', error);
      return { success: false, error: error.message || 'Could not remove.' };
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

  // Customers (user-specific). Migrates legacy customers to balanceByCurrency from transactions.
  // Uses getCurrency() for primary code to avoid circular dependency with getWallets().
  async getCustomers() {
    try {
      const key = getUserKey(STORAGE_KEYS.CUSTOMERS);
      const raw = await storage.getItemAsync(key);
      let customers = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(customers)) customers = [];

      const transactions = await this.getTransactions();
      const primaryCode = (await this.getCurrency()) || DEFAULT_CURRENCY;
      let needsSave = false;

      customers = customers.map(c => {
        const hasBalanceByCurrency = c.balanceByCurrency && typeof c.balanceByCurrency === 'object';
        if (hasBalanceByCurrency) return c;
        const balanceByCurrency = this._balanceByCurrencyFromTransactions(transactions, c.id);
        const balance = balanceByCurrency[primaryCode] ?? (parseFloat(c.balance) || 0);
        needsSave = true;
        return { ...c, balanceByCurrency, balance };
      });

      if (needsSave) await this.saveCustomers(customers);
      return customers;
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

  // Compute balanceByCurrency for a customer from their transactions (for migration).
  _balanceByCurrencyFromTransactions(transactions, customerId) {
    const byCurrency = {};
    transactions
      .filter(t => t.customerId === customerId)
      .forEach(t => {
        const code = (t.currencyCode || DEFAULT_CURRENCY).toUpperCase();
        if (!byCurrency[code]) byCurrency[code] = 0;
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'credit' || t.type === 'income') byCurrency[code] += amount;
        else if (t.type === 'debit' || t.type === 'expense') byCurrency[code] -= amount;
      });
    return byCurrency;
  },

  async addCustomer(customer) {
    try {
      const customers = await this.getCustomers();
      const newCustomer = {
        id: generateId(),
        ...customer,
        balanceByCurrency: {},
        balance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      customers.push(newCustomer);
      const saved = await this.saveCustomers(customers);
      if (!saved) return null;
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
      // Sequential: getWallets() must complete before getTransactions() to avoid migration race
      const wallets = await this.getWallets();
      const transactions = await this.getTransactions();
      const primaryCode = wallets.length > 0 ? wallets[0].currencyCode : DEFAULT_CURRENCY;
      const currencyCode = (transaction.currencyCode || primaryCode).toString().toUpperCase();
      const newTransaction = {
        id: generateId(),
        ...transaction,
        currencyCode,
        createdAt: transaction.date || new Date().toISOString(),
      };
      transactions.unshift(newTransaction);
      await this.saveTransactions(transactions);

      // Update customer balanceByCurrency (and primary-currency balance) if linked
      if (transaction.customerId) {
        const customers = await this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === transaction.customerId);
        if (customerIndex !== -1) {
          const amount = parseFloat(transaction.amount) || 0;
          const cust = customers[customerIndex];
          const byCurrency = { ...(cust.balanceByCurrency && typeof cust.balanceByCurrency === 'object' ? cust.balanceByCurrency : {}) };
          const code = (currencyCode || primaryCode).toUpperCase();
          const current = byCurrency[code] ?? 0;
          byCurrency[code] = (transaction.type === 'credit' || transaction.type === 'income') ? current + amount : current - amount;
          customers[customerIndex].balanceByCurrency = byCurrency;
          customers[customerIndex].balance = byCurrency[primaryCode] ?? 0;
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
      // Sequential: getWallets() must complete before getTransactions() to avoid migration race
      const wallets = await this.getWallets();
      const transactions = await this.getTransactions();
      const transactionIndex = transactions.findIndex(t => t.id === transactionId);
      const primaryCode = wallets.length > 0 ? wallets[0].currencyCode : DEFAULT_CURRENCY;

      if (transactionIndex === -1) return false;

      const oldTransaction = transactions[transactionIndex];

      // Reverse old customer balanceByCurrency
      if (oldTransaction.customerId) {
        const customers = await this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === oldTransaction.customerId);
        if (customerIndex !== -1) {
          const cust = customers[customerIndex];
          const byCurrency = { ...(cust.balanceByCurrency && typeof cust.balanceByCurrency === 'object' ? cust.balanceByCurrency : {}) };
          const code = (oldTransaction.currencyCode || primaryCode).toUpperCase();
          const amount = parseFloat(oldTransaction.amount) || 0;
          const current = byCurrency[code] ?? 0;
          byCurrency[code] = (oldTransaction.type === 'credit' || oldTransaction.type === 'income') ? current - amount : current + amount;
          customers[customerIndex].balanceByCurrency = byCurrency;
          customers[customerIndex].balance = byCurrency[primaryCode] ?? 0;
          customers[customerIndex].updatedAt = new Date().toISOString();
          await this.saveCustomers(customers);
        }
      }

      // Update transaction
      const newTransaction = {
        ...oldTransaction,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      transactions[transactionIndex] = newTransaction;
      await this.saveTransactions(transactions);

      // Apply new customer balanceByCurrency (use effective customer/amount/type/currency)
      const effCustomerId = updates.customerId !== undefined ? updates.customerId : oldTransaction.customerId;
      if (effCustomerId) {
        const customers = await this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === effCustomerId);
        if (customerIndex !== -1) {
          const amount = (parseFloat(newTransaction.amount) ?? parseFloat(oldTransaction.amount)) || 0;
          const type = newTransaction.type ?? oldTransaction.type;
          const currencyCode = (newTransaction.currencyCode || oldTransaction.currencyCode || primaryCode).toUpperCase();
          const cust = customers[customerIndex];
          const byCurrency = { ...(cust.balanceByCurrency && typeof cust.balanceByCurrency === 'object' ? cust.balanceByCurrency : {}) };
          const current = byCurrency[currencyCode] ?? 0;
          byCurrency[currencyCode] = (type === 'credit' || type === 'income') ? current + amount : current - amount;
          customers[customerIndex].balanceByCurrency = byCurrency;
          customers[customerIndex].balance = byCurrency[primaryCode] ?? 0;
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

  // Clear all transactions and all customers (local). Caller should sync to cloud after.
  async clearAllTransactions() {
    try {
      await this.saveCustomers([]);
      await this.saveTransactions([]);
      return true;
    } catch (error) {
      console.error('Error clearing transactions:', error);
      return false;
    }
  },

  async deleteTransaction(transactionId) {
    try {
      const [transactions, wallets] = await Promise.all([this.getTransactions(), this.getWallets()]);
      const transaction = transactions.find(t => t.id === transactionId);
      const primaryCode = wallets.length > 0 ? wallets[0].currencyCode : DEFAULT_CURRENCY;

      if (transaction && transaction.customerId) {
        const customers = await this.getCustomers();
        const customerIndex = customers.findIndex(c => c.id === transaction.customerId);
        if (customerIndex !== -1) {
          const cust = customers[customerIndex];
          const byCurrency = { ...(cust.balanceByCurrency && typeof cust.balanceByCurrency === 'object' ? cust.balanceByCurrency : {}) };
          const code = (transaction.currencyCode || primaryCode).toUpperCase();
          const amount = parseFloat(transaction.amount) || 0;
          const current = byCurrency[code] ?? 0;
          byCurrency[code] = (transaction.type === 'credit' || transaction.type === 'income') ? current - amount : current + amount;
          customers[customerIndex].balanceByCurrency = byCurrency;
          customers[customerIndex].balance = byCurrency[primaryCode] ?? 0;
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
      // Sequential to avoid race conditions (getWallets/getCustomers can write data internally)
      const wallets = await this.getWallets();
      const transactions = await this.getTransactions();
      const customers = await this.getCustomers();
      const [theme, currency, language, exchangeRates] = await Promise.all([
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
        currency: currency || DEFAULT_CURRENCY,
        language: language || 'en',
        exchangeRates: exchangeRates || { baseCurrency: DEFAULT_CURRENCY, rates: {} },
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
        wallets = [{ id: generateId(), currencyCode: primaryCode, initialBalance: 0 }];
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
