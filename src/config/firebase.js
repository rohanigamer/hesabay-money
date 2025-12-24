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
let app;
let auth;
let db;
let googleProvider;
let firebaseReady = false;

const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    // Initialize Auth
    auth = getAuth(app);
    
    // Initialize Firestore
    db = getFirestore(app);
    
    // Initialize Google Provider
    googleProvider = new GoogleAuthProvider();
    
    firebaseReady = true;
    console.log('Firebase initialized successfully');
    
    return true;
  } catch (error) {
    console.error('Firebase init error:', error);
    firebaseReady = false;
    return false;
  }
};

// Initialize immediately
initializeFirebase();

// Helper to check if Firebase is ready
const isFirebaseReady = () => firebaseReady;

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
