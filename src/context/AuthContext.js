import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform, Alert } from 'react-native';
import { setCurrentUserId } from '../utils/Storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseReady, initializeFirebase, getInitError, db } from '../config/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  // Initialize Firebase and set up auth listener
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;
    let checkInterval = null;

    const setupAuth = async () => {
      console.log('🔄 AuthContext: Setting up auth...');
      
      // Try to initialize Firebase if not ready
      if (!isFirebaseReady()) {
        console.log('🔄 AuthContext: Firebase not ready, calling initializeFirebase...');
        const initResult = initializeFirebase();
        console.log('🔄 AuthContext: Init result:', initResult);
        
        if (!initResult) {
          const error = getInitError();
          console.error('❌ AuthContext: Firebase init failed with error:', error);
        }
      }

      // Wait for Firebase to be ready (with polling)
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * 100ms = 3 seconds max
      
      checkInterval = setInterval(() => {
        attempts++;
        console.log(`🔄 AuthContext: Checking Firebase ready... (attempt ${attempts}/${maxAttempts})`);
        
        if (isFirebaseReady()) {
          console.log('✅ AuthContext: Firebase is ready!');
          clearInterval(checkInterval);
          checkInterval = null;
          
          if (!isMounted) return;
          
          // Get auth reference
          const { auth: currentAuth } = require('../config/firebase');
          
          if (!currentAuth) {
            console.error('❌ AuthContext: Auth is NULL even though Firebase says it\'s ready!');
            setFirebaseInitialized(false);
            setLoading(false);
            return;
          }

          console.log('✅ AuthContext: Auth object confirmed, setting up listener');
          setFirebaseInitialized(true);

          // Set up auth state listener
          try {
            unsubscribe = onAuthStateChanged(currentAuth, async (firebaseUser) => {
              if (!isMounted) return;
              
              console.log('🔔 Auth state changed:', firebaseUser ? `${firebaseUser.email} (verified: ${firebaseUser.emailVerified})` : 'logged out');
              
              if (firebaseUser) {
                setUser(firebaseUser);
                setCurrentUserId(firebaseUser.uid);
                
                // Try to merge with Firebase data (non-blocking)
                setTimeout(() => {
                  import('../services/FirebaseSync').then(({ firebaseSync }) => {
                    firebaseSync.mergeWithLocal().catch(e => console.log('Sync error:', e));
                  }).catch(e => console.log('Import error:', e));
                }, 100);
              } else {
                setUser(null);
                setCurrentUserId(null);
              }
              setLoading(false);
            });
          } catch (error) {
            console.error('❌ Error setting up auth listener:', error);
            if (isMounted) {
              setLoading(false);
            }
          }
        } else if (attempts >= maxAttempts) {
          console.error('⏱️ AuthContext: Timeout waiting for Firebase to be ready');
          clearInterval(checkInterval);
          checkInterval = null;
          
          const error = getInitError();
          if (error) {
            console.error('❌ AuthContext: Firebase init error was:', error);
          }
          
          if (isMounted) {
            setFirebaseInitialized(false);
            setLoading(false);
          }
        }
      }, 100);
    };

    // Start setup
    setupAuth();

    return () => {
      console.log('🧹 AuthContext: Cleanup');
      isMounted = false;
      if (unsubscribe) unsubscribe();
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // Sign up with email verification
  const signUp = async (email, password, name) => {
    const { auth: currentAuth } = require('../config/firebase');
    
    if (!currentAuth) {
      return { success: false, error: 'Please wait, connecting to server...' };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(currentAuth, email, password);
      
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      
      // Send verification email
      await sendEmailVerification(userCredential.user);
      
      // Sign out immediately - user must verify email first
      await signOut(currentAuth);
      setUser(null);
      setCurrentUserId(null);
      
      console.log('Account created, verification email sent, user signed out');
      
      return { 
        success: true, 
        user: null,
        message: 'Account created! Please check your email to verify before logging in.'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      const errorMsg = getErrorMessage(error);
      console.log('Returning error message:', errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Sign in
  const signIn = async (email, password) => {
    const { auth: currentAuth } = require('../config/firebase');
    
    if (!currentAuth) {
      return { success: false, error: 'Please wait, connecting to server...' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(currentAuth, email, password);
      
      // Check email verification
      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        return { 
          success: false, 
          error: 'Please verify your email first. A new verification email has been sent.',
          needsVerification: true
        };
      }
      
      setCurrentUserId(userCredential.user.uid);
      
      // Sync data
      try {
        const { firebaseSync } = await import('../services/FirebaseSync');
        await firebaseSync.mergeWithLocal();
      } catch (e) {
        console.log('Sync error:', e);
      }
      
      return { 
        success: true, 
        user: userCredential.user,
        message: `Welcome back, ${userCredential.user.displayName || 'User'}!`
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    const { auth: currentAuth } = require('../config/firebase');
    
    if (!currentAuth) {
      return { success: false, error: 'Please wait, connecting to server...' };
    }

    if (!email) {
      return { success: false, error: 'Please enter your email address.' };
    }

    try {
      await sendPasswordResetEmail(currentAuth, email);
      return { 
        success: true, 
        message: 'Password reset email sent! Check your inbox.' 
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  };

  // Resend verification email
  const resendVerificationEmail = async () => {
    const { auth: currentAuth } = require('../config/firebase');
    
    if (!currentAuth || !currentAuth.currentUser) {
      return { success: false, error: 'No user logged in.' };
    }

    try {
      await sendEmailVerification(currentAuth.currentUser);
      return { success: true, message: 'Verification email sent!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Log out
  const logOut = async () => {
    console.log('LogOut called');
    const { auth: currentAuth } = require('../config/firebase');
    
    // Sync before logout
    try {
      const { firebaseSync } = await import('../services/FirebaseSync');
      await firebaseSync.syncAllData();
    } catch (e) {
      console.log('Sync error:', e);
    }

    if (!currentAuth) {
      console.log('No auth, clearing user state');
      setUser(null);
      setCurrentUserId(null);
      return { success: true, message: 'Logged out successfully!' };
    }

    try {
      console.log('Signing out from Firebase...');
      await signOut(currentAuth);
      console.log('Signed out, clearing user state');
      setUser(null);
      setCurrentUserId(null);
      return { success: true, message: 'Logged out successfully!' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  // Google Sign-In
  const signInWithGoogle = async () => {
    const { auth: currentAuth, googleProvider: currentProvider } = require('../config/firebase');
    
    if (!currentAuth || !currentProvider) {
      return { success: false, error: 'Please wait, connecting to server...' };
    }

    try {
      if (Platform.OS === 'web') {
        const result = await signInWithPopup(currentAuth, currentProvider);
        setCurrentUserId(result.user.uid);
        
        const isNewUser = result._tokenResponse?.isNewUser;
        
        return { 
          success: true, 
          user: result.user,
          isNewUser: isNewUser,
          message: isNewUser 
            ? `Welcome! Account created with ${result.user.email}` 
            : `Welcome back, ${result.user.displayName || 'User'}!`
        };
      } else {
        // Mobile - Show message
        return { 
          success: false, 
          error: 'Google Sign-In on mobile requires additional setup.\n\nPlease use Email/Password or Continue as Guest.',
          showAlternatives: true
        };
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Sign-in was cancelled.' };
      }
      
      return { success: false, error: getErrorMessage(error) };
    }
  };

  // Continue as guest
  const continueAsGuest = () => {
    const guestUser = {
      uid: 'guest-user',
      displayName: 'Guest',
      email: null,
      isGuest: true,
      emailVerified: true
    };
    setUser(guestUser);
    setCurrentUserId('guest-user');
    return { 
      success: true, 
      user: guestUser,
      message: 'You are using the app as a guest. Data is stored locally on this device only.'
    };
  };

  // Sync data manually
  const syncData = async () => {
    try {
      const { firebaseSync } = await import('../services/FirebaseSync');
      return await firebaseSync.syncAllData();
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signUp, 
      signIn, 
      logOut, 
      signInWithGoogle,
      continueAsGuest,
      forgotPassword,
      resendVerificationEmail,
      syncData,
      firebaseInitialized
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper function to get user-friendly error messages
const getErrorMessage = (error) => {
  const code = error.code || '';
  
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. If you don\'t have an account, please sign up first.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};

export const useAuth = () => useContext(AuthContext);
