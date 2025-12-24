import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform, Alert } from 'react-native';
import { setCurrentUserId } from '../utils/Storage';

// Safe Firebase imports
let auth = null;
let googleProvider = null;
let firebaseAuth = null;

try {
  const firebase = require('../config/firebase');
  auth = firebase.auth;
  googleProvider = firebase.googleProvider;
  firebaseAuth = require('firebase/auth');
} catch (error) {
  console.warn('Firebase not available, running in offline mode');
}

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase auth is not available, use guest mode
    if (!auth || !firebaseAuth) {
      console.log('Firebase not available, using guest mode');
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = firebaseAuth.onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setCurrentUserId(firebaseUser?.uid || null);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Auth state listener error:', error);
      setLoading(false);
    }
  }, []);

  const signUp = async (email, password, name) => {
    if (!auth || !firebaseAuth) {
      return { success: false, error: 'Firebase not available. Please try again later.' };
    }
    
    try {
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(auth, email, password);
      
      await firebaseAuth.updateProfile(userCredential.user, {
        displayName: name
      });
      
      setCurrentUserId(userCredential.user.uid);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    if (!auth || !firebaseAuth) {
      return { success: false, error: 'Firebase not available. Please try again later.' };
    }
    
    try {
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(auth, email, password);
      setCurrentUserId(userCredential.user.uid);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  };

  const logOut = async () => {
    if (!auth || !firebaseAuth) {
      setUser(null);
      setCurrentUserId(null);
      return { success: true };
    }
    
    try {
      await firebaseAuth.signOut(auth);
      setCurrentUserId(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    // For now, show a message that Google Sign-In requires additional setup
    Alert.alert(
      'Google Sign-In',
      'Google Sign-In requires additional configuration. Please use email/password or continue as guest.',
      [{ text: 'OK' }]
    );
    return { success: false, error: 'Google Sign-In not configured' };
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
