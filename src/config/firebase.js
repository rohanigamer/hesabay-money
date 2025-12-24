// Firebase Configuration - Works on Web + Mobile (Expo)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
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

const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (getApps().length === 0) {
      console.log('🔥 Initializing Firebase app...');
      app = initializeApp(firebaseConfig);
    } else {
      console.log('🔥 Firebase app already exists');
      app = getApp();
    }

    // Initialize Auth - use simple getAuth for all platforms
    // Firebase JS SDK handles persistence automatically
    if (!auth) {
      auth = getAuth(app);
      console.log('✅ Firebase Auth initialized');
    }
    
    // Initialize Firestore
    if (!db) {
      db = getFirestore(app);
      console.log('✅ Firestore initialized');
    }
    
    // Initialize Google Provider
    if (!googleProvider) {
      googleProvider = new GoogleAuthProvider();
      console.log('✅ Google Provider initialized');
    }
    
    firebaseReady = true;
    console.log('🎉 Firebase fully initialized!');
    
    return true;
  } catch (error) {
    console.error('❌ Firebase init error:', error.message);
    firebaseReady = false;
    return false;
  }
};

// Initialize immediately
try {
  initializeFirebase();
} catch (e) {
  console.error('Firebase startup error:', e);
}

// Helper to check if Firebase is ready
const isFirebaseReady = () => firebaseReady && auth !== null;

// Re-export for use
export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  GoogleAuthProvider, 
  signInWithCredential,
  isFirebaseReady,
  initializeFirebase
};
