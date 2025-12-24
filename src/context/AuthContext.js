import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform, Alert } from 'react-native';
import { setCurrentUserId } from '../utils/Storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider, GoogleAuthProvider, signInWithCredential } from '../config/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.log('Firebase auth not available');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setCurrentUserId(firebaseUser.uid);
      } else {
        setUser(null);
        setCurrentUserId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email, password, name) => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized. Please restart the app.' };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      
      setCurrentUserId(userCredential.user.uid);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign up error:', error);
      let errorMessage = 'Sign up failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please sign in instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const signIn = async (email, password) => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized. Please restart the app.' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setCurrentUserId(userCredential.user.uid);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign in error:', error);
      let errorMessage = 'Sign in failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email. Please sign up first.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check and try again.';
          break;
        default:
          errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logOut = async () => {
    if (!auth) {
      setUser(null);
      setCurrentUserId(null);
      return { success: true };
    }

    try {
      await signOut(auth);
      setCurrentUserId(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      return { success: false, error: 'Google Sign-In not available. Please use email/password.' };
    }

    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase popup
        const result = await signInWithPopup(auth, googleProvider);
        setCurrentUserId(result.user.uid);
        return { success: true, user: result.user };
      } else {
        // Mobile: Google Sign-In requires additional native setup
        // For now, show a helpful message
        Alert.alert(
          'Google Sign-In',
          'Google Sign-In on mobile requires additional setup with SHA-1 certificates. Please use email/password login or continue as guest.',
          [{ text: 'OK' }]
        );
        return { success: false, error: 'Use email/password on mobile' };
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      return { success: false, error: error.message || 'Google Sign-In failed' };
    }
  };

  const continueAsGuest = () => {
    const guestUser = {
      uid: 'guest-user',
      displayName: 'Guest',
      email: null,
      isGuest: true
    };
    setUser(guestUser);
    setCurrentUserId('guest-user');
    return { success: true, user: guestUser };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signUp, 
      signIn, 
      logOut, 
      signInWithGoogle,
      continueAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
