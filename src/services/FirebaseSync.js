import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Storage } from '../utils/Storage';
import NetInfo from '@react-native-community/netinfo';

class FirebaseSyncService {
  constructor() {
    this.isOnline = true;
    this.syncInProgress = false;
    this.unsubscribers = [];
    
    // Monitor network status
    this.setupNetworkListener();
  }

  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      // If just came online, sync data
      if (wasOffline && this.isOnline) {
        console.log('Back online - syncing data...');
        this.syncAllData();
      }
    });
  }

  // Sync all local data to Firebase
  async syncAllData(userId) {
    if (!userId || this.syncInProgress) return;
    
    this.syncInProgress = true;
    
    try {
      const [customers, transactions] = await Promise.all([
        Storage.getCustomers(),
        Storage.getTransactions()
      ]);

      await this.syncCustomers(userId, customers);
      await this.syncTransactions(userId, transactions);
      
      console.log('Data synced successfully');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync customers to Firebase
  async syncCustomers(userId, customers) {
    if (!this.isOnline) return;

    const batch = writeBatch(db);
    const customersRef = collection(db, `users/${userId}/customers`);

    customers.forEach(customer => {
      const docRef = doc(customersRef, customer.id);
      batch.set(docRef, customer, { merge: true });
    });

    await batch.commit();
  }

  // Sync transactions to Firebase
  async syncTransactions(userId, transactions) {
    if (!this.isOnline) return;

    const batch = writeBatch(db);
    const transactionsRef = collection(db, `users/${userId}/transactions`);

    transactions.forEach(transaction => {
      const docRef = doc(transactionsRef, transaction.id);
      batch.set(docRef, transaction, { merge: true });
    });

    await batch.commit();
  }

  // Load data from Firebase to local storage
  async loadFromFirebase(userId) {
    if (!this.isOnline || !userId) return;

    try {
      // Load customers
      const customersSnapshot = await getDocs(collection(db, `users/${userId}/customers`));
      const customers = customersSnapshot.docs.map(doc => doc.data());
      await Storage.saveCustomers(customers);

      // Load transactions
      const transactionsSnapshot = await getDocs(collection(db, `users/${userId}/transactions`));
      const transactions = transactionsSnapshot.docs.map(doc => doc.data());
      await Storage.saveTransactions(transactions);

      console.log('Data loaded from Firebase');
    } catch (error) {
      console.error('Load from Firebase error:', error);
    }
  }

  // Real-time sync listeners
  setupRealtimeSync(userId) {
    if (!userId) return;

    // Listen to customers changes
    const customersUnsubscribe = onSnapshot(
      collection(db, `users/${userId}/customers`),
      (snapshot) => {
        const customers = snapshot.docs.map(doc => doc.data());
        Storage.saveCustomers(customers);
      }
    );

    // Listen to transactions changes
    const transactionsUnsubscribe = onSnapshot(
      collection(db, `users/${userId}/transactions`),
      (snapshot) => {
        const transactions = snapshot.docs.map(doc => doc.data());
        Storage.saveTransactions(transactions);
      }
    );

    this.unsubscribers = [customersUnsubscribe, transactionsUnsubscribe];
  }

  // Stop real-time sync
  stopRealtimeSync() {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }

  // Add customer (works offline/online)
  async addCustomer(userId, customer) {
    // Save locally first
    await Storage.addCustomer(customer);

    // Sync to Firebase if online
    if (this.isOnline && userId) {
      try {
        await setDoc(doc(db, `users/${userId}/customers`, customer.id), customer);
      } catch (error) {
        console.error('Firebase add customer error:', error);
      }
    }
  }

  // Update customer (works offline/online)
  async updateCustomer(userId, customerId, updates) {
    // Update locally first
    await Storage.updateCustomer(customerId, updates);

    // Sync to Firebase if online
    if (this.isOnline && userId) {
      try {
        await setDoc(doc(db, `users/${userId}/customers`, customerId), updates, { merge: true });
      } catch (error) {
        console.error('Firebase update customer error:', error);
      }
    }
  }

  // Delete customer (works offline/online)
  async deleteCustomer(userId, customerId) {
    // Delete locally first
    await Storage.deleteCustomer(customerId);

    // Sync to Firebase if online
    if (this.isOnline && userId) {
      try {
        await deleteDoc(doc(db, `users/${userId}/customers`, customerId));
      } catch (error) {
        console.error('Firebase delete customer error:', error);
      }
    }
  }

  // Add transaction (works offline/online)
  async addTransaction(userId, transaction) {
    // Save locally first
    await Storage.addTransaction(transaction);

    // Sync to Firebase if online
    if (this.isOnline && userId) {
      try {
        await setDoc(doc(db, `users/${userId}/transactions`, transaction.id), transaction);
      } catch (error) {
        console.error('Firebase add transaction error:', error);
      }
    }
  }

  // Update transaction (works offline/online)
  async updateTransaction(userId, transactionId, updates) {
    // Update locally first
    await Storage.updateTransaction(transactionId, updates);

    // Sync to Firebase if online
    if (this.isOnline && userId) {
      try {
        await setDoc(doc(db, `users/${userId}/transactions`, transactionId), updates, { merge: true });
      } catch (error) {
        console.error('Firebase update transaction error:', error);
      }
    }
  }

  // Delete transaction (works offline/online)
  async deleteTransaction(userId, transactionId) {
    // Delete locally first
    await Storage.deleteTransaction(transactionId);

    // Sync to Firebase if online
    if (this.isOnline && userId) {
      try {
        await deleteDoc(doc(db, `users/${userId}/transactions`, transactionId));
      } catch (error) {
        console.error('Firebase delete transaction error:', error);
      }
    }
  }
}

export default new FirebaseSyncService();

