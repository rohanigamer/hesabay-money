// Production Firebase Configuration - Works on Web + Mobile
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

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
  // Initialize Firebase App (only once)
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
  } else {
    app = getApp();
    console.log('✅ Firebase app already exists');
  }

  // Use standard getAuth for all platforms
  // This works for both web and React Native with Expo
  auth = getAuth(app);
  console.log('✅ Firebase auth initialized');

  // Initialize Firestore
  db = getFirestore(app);
  console.log('✅ Firestore initialized');
  
  // Initialize Google Provider
  googleProvider = new GoogleAuthProvider();

} catch (error) {
  console.error('❌ Firebase error:', error.message);
}

export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  GoogleAuthProvider, 
  signInWithCredential 
};
