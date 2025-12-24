// Firebase Sync Service - Handles offline/online data synchronization
import { db } from '../config/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { Storage, getCurrentUserId, setOnDataChange } from '../utils/Storage';

class FirebaseSyncService {
  constructor() {
    this.isOnline = true;
    this.syncPending = false;
    this.syncInProgress = false;
    this.initialized = false;
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

  // Get user's Firestore path
  getUserPath() {
    const userId = getCurrentUserId();
    if (!userId || userId === 'guest-user') {
      return null; // Guest users don't sync to Firebase
    }
    return `users/${userId}`;
  }

  // Sync all data to Firebase
  async syncAllData() {
    if (!db) {
      console.log('Firebase DB not available');
      return { success: false, error: 'Firebase not initialized' };
    }

    // Check network status
    const netState = await NetInfo.fetch();
    this.isOnline = netState.isConnected && netState.isInternetReachable;

    if (!this.isOnline) {
      console.log('📴 Offline - sync pending');
      this.syncPending = true;
      return { success: false, error: 'Offline', pending: true };
    }
    
    const userPath = this.getUserPath();
    if (!userPath) {
      return { success: false, error: 'Guest user - no sync' };
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
      
      // Save to Firestore
      const dataRef = doc(db, userPath, 'data');
      await setDoc(dataRef, {
        customers: customers,
        transactions: transactions,
        lastSyncedAt: serverTimestamp(),
        deviceInfo: {
          platform: require('react-native').Platform.OS,
          syncTime: new Date().toISOString()
        }
      }, { merge: true });
      
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

  // Load data from Firebase (for new device login)
  async loadFromFirebase() {
    if (!db) return null;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return null;
    
    const userPath = this.getUserPath();
    if (!userPath) return null;

    try {
      const dataRef = doc(db, userPath, 'data');
      const snapshot = await getDoc(dataRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('📥 Loaded data from Firebase');
        return {
          customers: data.customers || [],
          transactions: data.transactions || []
        };
      }
      return null;
    } catch (error) {
      console.error('Error loading from Firebase:', error);
      return null;
    }
  }

  // Merge Firebase data with local data (used on login)
  async mergeWithLocal() {
    const firebaseData = await this.loadFromFirebase();
    if (!firebaseData) return;

    const localCustomers = await Storage.getCustomers();
    const localTransactions = await Storage.getTransactions();

    // If local is empty, use Firebase data
    if (localCustomers.length === 0 && firebaseData.customers.length > 0) {
      // Directly save without triggering sync (to avoid loop)
      const key = `${getCurrentUserId()}_customers`;
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const SecureStore = require('expo-secure-store');
      const Platform = require('react-native').Platform;
      
      try {
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(key, JSON.stringify(firebaseData.customers));
        } else {
          await SecureStore.setItemAsync(key, JSON.stringify(firebaseData.customers));
        }
        console.log('📥 Loaded customers from Firebase');
      } catch (e) {
        console.log('Error saving customers:', e);
      }
    }
    
    if (localTransactions.length === 0 && firebaseData.transactions.length > 0) {
      const key = `${getCurrentUserId()}_transactions`;
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const SecureStore = require('expo-secure-store');
      const Platform = require('react-native').Platform;
      
      try {
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(key, JSON.stringify(firebaseData.transactions));
        } else {
          await SecureStore.setItemAsync(key, JSON.stringify(firebaseData.transactions));
        }
        console.log('📥 Loaded transactions from Firebase');
      } catch (e) {
        console.log('Error saving transactions:', e);
      }
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
