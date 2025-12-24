// Firebase Configuration - Bulletproof for React Native + Web
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

// Global Firebase instances
let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let firebaseReady = false;
let initError = null;
let initAttempts = 0;

// Initialize Firebase with retry logic
const initializeFirebase = () => {
  return new Promise((resolve) => {
    initAttempts++;
    console.log(`🔥 Firebase init attempt #${initAttempts}`);

    try {
      // Step 1: Initialize Firebase App
      if (getApps().length === 0) {
        console.log('📱 Creating new Firebase app...');
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app created');
      } else {
        console.log('📱 Using existing Firebase app');
        app = getApp();
      }

      // Step 2: Initialize Auth (with delay for mobile)
      setTimeout(() => {
        try {
          if (!auth) {
            console.log('🔐 Initializing Auth...');
            auth = getAuth(app);
            
            // Force auth to be ready by accessing a property
            if (auth && auth.app) {
              console.log('✅ Auth initialized and verified');
            } else {
              throw new Error('Auth object is invalid');
            }
          }

          // Step 3: Initialize Firestore
          if (!db) {
            console.log('💾 Initializing Firestore...');
            db = getFirestore(app);
            console.log('✅ Firestore initialized');
          }

          // Step 4: Initialize Google Provider
          if (!googleProvider) {
            console.log('🔑 Initializing Google Provider...');
            googleProvider = new GoogleAuthProvider();
            console.log('✅ Google Provider initialized');
          }

          firebaseReady = true;
          initError = null;
          console.log('🎉 Firebase READY!');
          console.log('📊 Status:', {
            app: !!app,
            auth: !!auth,
            db: !!db,
            provider: !!googleProvider
          });
          
          resolve(true);
        } catch (error) {
          console.error('❌ Error during auth initialization:', error.message);
          initError = error;
          firebaseReady = false;
          
          // Retry up to 3 times
          if (initAttempts < 3) {
            console.log(`🔄 Retrying in 1 second... (attempt ${initAttempts}/3)`);
            setTimeout(() => {
              initializeFirebase().then(resolve);
            }, 1000);
          } else {
            console.error('❌ Failed after 3 attempts');
            resolve(false);
          }
        }
      }, 200); // 200ms delay to let Firebase register components

    } catch (error) {
      console.error('❌ Fatal Firebase error:', error.message);
      console.error('Stack:', error.stack);
      initError = error;
      firebaseReady = false;
      
      // Retry up to 3 times
      if (initAttempts < 3) {
        console.log(`🔄 Retrying in 1 second... (attempt ${initAttempts}/3)`);
        setTimeout(() => {
          initializeFirebase().then(resolve);
        }, 1000);
      } else {
        console.error('❌ Failed after 3 attempts');
        resolve(false);
      }
    }
  });
};

// Helper to check if Firebase is ready
const isFirebaseReady = () => {
  const ready = firebaseReady && auth !== null && db !== null;
  if (!ready) {
    console.log('❌ Firebase not ready:', {
      firebaseReady,
      hasAuth: auth !== null,
      hasDb: db !== null
    });
  }
  return ready;
};

// Helper to get initialization error
const getInitError = () => initError;

// Helper to manually retry initialization
const retryInitialization = async () => {
  console.log('🔄 Manual retry requested');
  initAttempts = 0; // Reset attempts
  return await initializeFirebase();
};

// Export everything
export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  GoogleAuthProvider, 
  signInWithCredential,
  isFirebaseReady,
  getInitError,
  initializeFirebase,
  retryInitialization
};

// Auto-initialize on import
console.log('⏰ Auto-initializing Firebase...');
initializeFirebase().then((success) => {
  if (success) {
    console.log('✅ Auto-init successful');
  } else {
    console.error('❌ Auto-init failed, but app will continue');
  }
});
