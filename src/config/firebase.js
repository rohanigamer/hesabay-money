// Production Firebase Configuration
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

try {
  // Initialize Firebase App
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // Initialize Auth with proper persistence for React Native
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    // For React Native, use AsyncStorage persistence
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } catch (error) {
      // Auth might already be initialized
      auth = getAuth(app);
    }
  }

  // Initialize Firestore
  db = getFirestore(app);
  
  // Initialize Google Provider
  googleProvider = new GoogleAuthProvider();

  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
}

export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  GoogleAuthProvider, 
  signInWithCredential 
};
