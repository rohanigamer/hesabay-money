import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  THEME: 'app_theme',
  LANGUAGE: 'app_language',
  CURRENCY: 'app_currency',
  APP_DATA: 'app_data',
  CUSTOMERS: 'customers',
  TRANSACTIONS: 'transactions',
};

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
      const transactions = await this.getTransactions();
      const newTransaction = {
        id: Date.now().toString(),
        ...transaction,
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
};
