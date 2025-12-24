// Firebase Configuration - Cross-platform solution
// Uses Firebase JS SDK for web, REST API for mobile
import { Platform } from 'react-native';

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

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let firebaseReady = false;
let isWeb = Platform.OS === 'web';

console.log('🔥 Firebase Config loaded, Platform:', Platform.OS);

// Initialize Firebase - only use SDK on web
const initializeFirebase = async () => {
  try {
    console.log(`🔥 Initializing Firebase for ${Platform.OS}...`);
    
    if (isWeb) {
      // Web: Use Firebase JS SDK
      console.log('📱 Web platform detected - using Firebase SDK');
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getAuth, GoogleAuthProvider } = await import('firebase/auth');
      const { getFirestore } = await import('firebase/firestore');
      
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app created');
      } else {
        app = getApp();
        console.log('✅ Using existing Firebase app');
      }
      
      auth = getAuth(app);
      db = getFirestore(app);
      googleProvider = new GoogleAuthProvider();
      
      console.log('✅ Firebase SDK fully initialized for web');
      firebaseReady = true;
      return true;
    } else {
      // Mobile: Use REST API (no SDK needed)
      console.log('📱 Mobile platform detected - using REST API');
      console.log('✅ Firebase REST API ready for mobile');
      firebaseReady = true;
      return true;
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    firebaseReady = false;
    return false;
  }
};

// Helper to check if Firebase is ready
const isFirebaseReady = () => {
  if (!isWeb) {
    // Mobile: Always ready (uses REST API)
    return true;
  }
  // Web: Check SDK is loaded
  return firebaseReady && auth !== null;
};

// Firebase REST API URL
const getFirebaseRestUrl = (endpoint) => {
  return `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${firebaseConfig.apiKey}`;
};

// Get Firestore REST URL
const getFirestoreRestUrl = (path) => {
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/${path}`;
};

// Export configuration and helpers
export { 
  app, 
  auth, 
  db,
  googleProvider,
  isFirebaseReady,
  initializeFirebase,
  firebaseConfig,
  getFirebaseRestUrl,
  getFirestoreRestUrl,
  isWeb
};

// Export Firebase SDK functions for web (dynamic import)
export const getFirebaseAuth = async () => {
  if (isWeb) {
    const { getAuth } = await import('firebase/auth');
    return { getAuth };
  }
  return null;
};

export const getFirebaseAuthFunctions = async () => {
  if (isWeb) {
    return await import('firebase/auth');
  }
  return null;
};

export const getFirestoreFunctions = async () => {
  if (isWeb) {
    return await import('firebase/firestore');
  }
  return null;
};

// Auto-initialize
console.log('⏰ Auto-initializing Firebase...');
initializeFirebase().then((success) => {
  if (success) {
    console.log('✅ Firebase initialized successfully');
  } else {
    console.error('❌ Firebase initialization failed');
  }
});
