// Production Firebase - Works on ALL platforms
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

console.log('Firebase initialized successfully');

export { auth, db, googleProvider, GoogleAuthProvider, PhoneAuthProvider, signInWithCredential };

