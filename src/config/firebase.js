// Firebase Configuration - Works on Web + Mobile (Expo)
// Using Firebase v9 for better React Native compatibility
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
    console.log('🔥 Starting Firebase v9 initialization...');
    
    // Check if already initialized
    if (getApps().length === 0) {
      console.log('🔥 Initializing Firebase app...');
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase app created');
    } else {
      console.log('🔥 Firebase app already exists');
      app = getApp();
    }

    // Initialize Auth - Firebase v9 works better with React Native
    if (!auth) {
      console.log('🔐 Initializing Firebase Auth...');
      auth = getAuth(app);
      console.log('✅ Firebase Auth initialized');
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
    console.log('🎉 Firebase v9 fully initialized and ready!');
    console.log('📊 Auth:', auth ? 'Available' : 'NULL');
    console.log('📊 DB:', db ? 'Available' : 'NULL');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization FAILED:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    firebaseReady = false;
    initError = error;
    return false;
  }
};

// Initialize immediately
console.log('⏰ Starting immediate Firebase v9 init...');
try {
  const result = initializeFirebase();
  console.log('✅ Immediate init result:', result);
} catch (e) {
  console.error('💥 Firebase startup error:', e);
  console.error('Stack:', e ? e.stack : 'No stack trace');
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
