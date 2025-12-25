// Firebase Sync Service - Handles offline/online data synchronization
// Works with both Firebase SDK (web) and REST API (mobile)
import NetInfo from '@react-native-community/netinfo';
import { Storage, getCurrentUserId, setOnDataChange } from '../utils/Storage';
import { Platform } from 'react-native';
import { isWeb, firebaseConfig } from '../config/firebase';

class FirebaseSyncService {
  constructor() {
    this.isOnline = true;
    this.syncPending = false;
    this.syncInProgress = false;
    this.initialized = false;
    this.currentUserToken = null;
  }

  initialize() {
    if (this.initialized) return;
    this.initialized = true;
    
    // Setup network listener
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      // If we just came online and have pending sync, do it
      if (wasOffline && this.isOnline && this.syncPending) {
        console.log('📶 Back online - syncing pending data...');
        this.syncAllData();
      }
    });

    // Setup data change listener
    setOnDataChange(() => {
      this.syncAllData();
    });

    console.log('🔄 Firebase Sync Service initialized');
  }

  // Get user ID and token for Firestore
  async getUserAuth() {
    const userId = getCurrentUserId();
    if (!userId || userId === 'guest-user') {
      return null; // Guest users don't sync to Firebase
    }
    
    // Get user token (needed for REST API on mobile)
    if (!isWeb) {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      try {
        // Try to get token from firebaseIdToken (saved by REST API)
        const token = await AsyncStorage.getItem('firebaseIdToken');
        if (token) {
          return { userId, token };
        }
        
        // Fallback: try old format
        const savedUser = await AsyncStorage.getItem('@firebase_auth_user');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          return { userId, token: user.idToken };
        }
      } catch (error) {
        console.error('Error getting user token:', error);
      }
      return null;
    }
    
    return { userId, token: null };
  }

  // Sync all data to Firebase
  async syncAllData() {
    // Check network status
    const netState = await NetInfo.fetch();
    this.isOnline = netState.isConnected && netState.isInternetReachable;

    if (!this.isOnline) {
      console.log('📴 Offline - sync pending');
      this.syncPending = true;
      return { success: false, error: 'Offline', pending: true };
    }
    
    const userAuth = await this.getUserAuth();
    if (!userAuth) {
      return { success: false, error: 'No authenticated user' };
    }

    // Prevent concurrent syncs
    if (this.syncInProgress) {
      this.syncPending = true;
      return { success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    this.syncPending = false;

    try {
      // Get local data
      const customers = await Storage.getCustomers();
      const transactions = await Storage.getTransactions();
      
      const dataToSync = {
        customers: customers,
        transactions: transactions,
        lastSyncedAt: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
          syncTime: new Date().toISOString()
        }
      };

      if (isWeb) {
        // Web: Use Firebase SDK
        await this.syncWithSDK(userAuth.userId, dataToSync);
      } else {
        // Mobile: Use REST API
        await this.syncWithREST(userAuth.userId, userAuth.token, dataToSync);
      }
      
      console.log('✅ Data synced to Firebase');
      this.syncInProgress = false;
      
      // If another sync was requested during this one, do it
      if (this.syncPending) {
        setTimeout(() => this.syncAllData(), 500);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Sync error:', error);
      this.syncInProgress = false;
      this.syncPending = true; // Retry later
      return { success: false, error: error.message };
    }
  }

  // Sync using Firebase SDK (web)
  async syncWithSDK(userId, data) {
    const { db } = await import('../config/firebase');
    const { doc, setDoc } = await import('firebase/firestore');
    
    if (!db) {
      throw new Error('Firebase Firestore not available');
    }
    
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, data, { merge: true });
  }

  // Sync using REST API (mobile)
  async syncWithREST(userId, token, data) {
    if (!token) {
      throw new Error('No auth token available');
    }

    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${userId}`;
    
    // Convert data to Firestore format
    const firestoreData = {
      fields: {
        customers: { arrayValue: { values: data.customers.map(c => ({ mapValue: { fields: this.convertToFirestoreFields(c) } })) } },
        transactions: { arrayValue: { values: data.transactions.map(t => ({ mapValue: { fields: this.convertToFirestoreFields(t) } })) } },
        lastSyncedAt: { stringValue: data.lastSyncedAt },
        deviceInfo: { mapValue: { fields: this.convertToFirestoreFields(data.deviceInfo) } }
      }
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(firestoreData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Firestore sync failed');
    }
  }

  // Convert JavaScript object to Firestore field format
  convertToFirestoreFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        fields[key] = { nullValue: null };
      } else if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        fields[key] = { doubleValue: value };
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (Array.isArray(value)) {
        fields[key] = { 
          arrayValue: { 
            values: value.map(v => 
              typeof v === 'object' ? 
              { mapValue: { fields: this.convertToFirestoreFields(v) } } : 
              { stringValue: String(v) }
            ) 
          } 
        };
      } else if (typeof value === 'object') {
        fields[key] = { mapValue: { fields: this.convertToFirestoreFields(value) } };
      }
    }
    return fields;
  }

  // Convert Firestore field format to JavaScript object
  convertFromFirestoreFields(fields) {
    const obj = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value.stringValue !== undefined) {
        obj[key] = value.stringValue;
      } else if (value.doubleValue !== undefined) {
        obj[key] = value.doubleValue;
      } else if (value.integerValue !== undefined) {
        obj[key] = parseInt(value.integerValue);
      } else if (value.booleanValue !== undefined) {
        obj[key] = value.booleanValue;
      } else if (value.arrayValue) {
        obj[key] = (value.arrayValue.values || []).map(v => {
          if (v.mapValue) return this.convertFromFirestoreFields(v.mapValue.fields);
          if (v.stringValue !== undefined) return v.stringValue;
          return null;
        });
      } else if (value.mapValue) {
        obj[key] = this.convertFromFirestoreFields(value.mapValue.fields);
      } else if (value.nullValue !== undefined) {
        obj[key] = null;
      }
    }
    return obj;
  }

  // Load data from Firebase (for new device login)
  async loadFromFirebase() {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return null;
    
    const userAuth = await this.getUserAuth();
    if (!userAuth) return null;

    try {
      if (isWeb) {
        return await this.loadWithSDK(userAuth.userId);
      } else {
        return await this.loadWithREST(userAuth.userId, userAuth.token);
      }
    } catch (error) {
      console.error('Error loading from Firebase:', error);
      return null;
    }
  }

  // Load using Firebase SDK (web)
  async loadWithSDK(userId) {
    const { db } = await import('../config/firebase');
    const { doc, getDoc } = await import('firebase/firestore');
    
    if (!db) return null;
    
    const userDocRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userDocRef);
    
    if (snapshot.exists()) {
      const data = snapshot.data();
      console.log('📥 Loaded data from Firebase (SDK)');
      return {
        customers: data.customers || [],
        transactions: data.transactions || []
      };
    }
    return null;
  }

  // Load using REST API (mobile)
  async loadWithREST(userId, token) {
    if (!token) return null;

    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${userId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null; // Document doesn't exist yet
      throw new Error('Failed to load from Firestore');
    }

    const data = await response.json();
    console.log('📥 Loaded data from Firebase (REST)');
    
    const fields = data.fields || {};
    return {
      customers: fields.customers?.arrayValue?.values?.map(v => 
        this.convertFromFirestoreFields(v.mapValue?.fields || {})
      ) || [],
      transactions: fields.transactions?.arrayValue?.values?.map(v => 
        this.convertFromFirestoreFields(v.mapValue?.fields || {})
      ) || []
    };
  }

  // Merge Firebase data with local data (used on login)
  async mergeWithLocal() {
    const firebaseData = await this.loadFromFirebase();
    if (!firebaseData) return;

    const localCustomers = await Storage.getCustomers();
    const localTransactions = await Storage.getTransactions();

    // If local is empty, use Firebase data
    if (localCustomers.length === 0 && firebaseData.customers.length > 0) {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const SecureStore = require('expo-secure-store');
      const userId = getCurrentUserId();
      const key = `${userId}_customers`;
      
      try {
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(key, JSON.stringify(firebaseData.customers));
        } else {
          await SecureStore.setItemAsync(key, JSON.stringify(firebaseData.customers));
        }
        console.log('📥 Merged customers from Firebase');
      } catch (e) {
        console.log('Error saving customers:', e);
      }
    }
    
    if (localTransactions.length === 0 && firebaseData.transactions.length > 0) {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const SecureStore = require('expo-secure-store');
      const userId = getCurrentUserId();
      const key = `${userId}_transactions`;
      
      try {
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(key, JSON.stringify(firebaseData.transactions));
        } else {
          await SecureStore.setItemAsync(key, JSON.stringify(firebaseData.transactions));
        }
        console.log('📥 Merged transactions from Firebase');
      } catch (e) {
        console.log('Error saving transactions:', e);
      }
    }
  }

  // Force refresh from Firebase - OVERWRITES local data
  async forceRefreshFromFirebase() {
    console.log('🔄 Force refreshing data from Firebase...');
    
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return { success: false, error: 'No internet connection' };
    }
    
    const userAuth = await this.getUserAuth();
    if (!userAuth) {
      return { success: false, error: 'Not logged in' };
    }

    try {
      const firebaseData = await this.loadFromFirebase();
      
      if (!firebaseData) {
        return { success: false, error: 'No data found in Firebase' };
      }

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const SecureStore = require('expo-secure-store');
      const userId = getCurrentUserId();
      
      // OVERWRITE customers
      const customersKey = `${userId}_customers`;
      try {
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(customersKey, JSON.stringify(firebaseData.customers));
        } else {
          await SecureStore.setItemAsync(customersKey, JSON.stringify(firebaseData.customers));
        }
        console.log(`✅ Refreshed ${firebaseData.customers.length} customers from Firebase`);
      } catch (e) {
        console.error('Error saving customers:', e);
        return { success: false, error: 'Failed to save customers locally' };
      }
      
      // OVERWRITE transactions
      const transactionsKey = `${userId}_transactions`;
      try {
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(transactionsKey, JSON.stringify(firebaseData.transactions));
        } else {
          await SecureStore.setItemAsync(transactionsKey, JSON.stringify(firebaseData.transactions));
        }
        console.log(`✅ Refreshed ${firebaseData.transactions.length} transactions from Firebase`);
      } catch (e) {
        console.error('Error saving transactions:', e);
        return { success: false, error: 'Failed to save transactions locally' };
      }
      
      return { 
        success: true, 
        customersCount: firebaseData.customers.length,
        transactionsCount: firebaseData.transactions.length
      };
    } catch (error) {
      console.error('❌ Force refresh error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if online
  async checkConnection() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected && state.isInternetReachable;
    return this.isOnline;
  }
}

export const firebaseSync = new FirebaseSyncService();

// Initialize sync service
firebaseSync.initialize();

export default firebaseSync;
