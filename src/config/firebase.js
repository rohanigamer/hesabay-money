// Firebase Configuration - Works on Web + Mobile (Expo)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfKYr27AqnL-vbcz7tzN_VBZQTa3N_-uA",
  authDomain: "hesabay-money.firebaseapp.com",
  projectId: "hesabay-money",
  storageBucket: "hesabay-money.firebasestorage.app",
  messagingSenderId: "350936013602",
  appId: "1:350936013602:web:45af4d816cf522594ce37b",
  measurementId: "G-77PHLRBP0Z"
};

// Initialize Firebase
let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let firebaseReady = false;
let initError = null;

const initializeFirebase = () => {
  try {
    console.log('🔥 Starting Firebase initialization...');
    console.log('📱 Platform:', Platform.OS);
    
    // Check if already initialized
    if (getApps().length === 0) {
      console.log('🔥 Initializing Firebase app...');
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase app created');
    } else {
      console.log('🔥 Firebase app already exists');
      app = getApp();
    }

    // Initialize Auth with platform-specific persistence
    if (!auth) {
      console.log('🔐 Initializing Firebase Auth...');
      
      try {
        if (Platform.OS === 'web') {
          // Web: use default getAuth (handles browser persistence automatically)
          console.log('Using web auth (default persistence)');
          auth = getAuth(app);
        } else {
          // Mobile: use initializeAuth with AsyncStorage persistence
          console.log('Using mobile auth with AsyncStorage persistence');
          auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
          });
        }
        console.log('✅ Firebase Auth initialized successfully');
      } catch (authError) {
        // If initializeAuth fails (already initialized), try getAuth
        console.log('⚠️ initializeAuth failed, trying getAuth:', authError.message);
        auth = getAuth(app);
        console.log('✅ Firebase Auth recovered with getAuth');
      }
    }
    
    // Initialize Firestore
    if (!db) {
      console.log('💾 Initializing Firestore...');
      db = getFirestore(app);
      console.log('✅ Firestore initialized');
    }
    
    // Initialize Google Provider
    if (!googleProvider) {
      console.log('🔑 Initializing Google Provider...');
      googleProvider = new GoogleAuthProvider();
      console.log('✅ Google Provider initialized');
    }
    
    firebaseReady = true;
    initError = null;
    console.log('🎉 Firebase fully initialized and ready!');
    console.log('📊 Auth object:', auth ? 'Available' : 'NULL');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization FAILED:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    firebaseReady = false;
    initError = error;
    return false;
  }
};

// Initialize immediately
console.log('⏰ Starting immediate Firebase init...');
try {
  const result = initializeFirebase();
  console.log('Immediate init result:', result);
} catch (e) {
  console.error('💥 Firebase startup error:', e);
  console.error('Stack:', e.stack);
  initError = e;
}

// Helper to check if Firebase is ready
const isFirebaseReady = () => {
  const ready = firebaseReady && auth !== null;
  console.log('isFirebaseReady check:', { firebaseReady, hasAuth: auth !== null, result: ready });
  return ready;
};

// Helper to get initialization error
const getInitError = () => initError;

// Re-export for use
export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  GoogleAuthProvider, 
  signInWithCredential,
  isFirebaseReady,
  getInitError,
  initializeFirebase
};
