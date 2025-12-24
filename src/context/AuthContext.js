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
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import firebaseSync from '../services/FirebaseSync';

export const AuthContext = createContext();

// Helper to show confirmation dialog
const showConfirmation = (title, message, onOk) => {
  Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.log('Firebase auth not available');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setCurrentUserId(firebaseUser.uid);
        
        // Load data from Firebase for this user
        try {
          await firebaseSync.mergeWithLocal();
        } catch (e) {
          console.log('Could not sync from Firebase:', e);
        }
      } else {
        setUser(null);
        setCurrentUserId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sign up with email verification
  const signUp = async (email, password, name) => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized. Please restart the app.' };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      
      await sendEmailVerification(userCredential.user);
      
      return { 
        success: true, 
        user: userCredential.user,
        message: 'Account created! Please check your email to verify your account.'
      };
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

  // Sign in
  const signIn = async (email, password) => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized. Please restart the app.' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        return { 
          success: false, 
          error: 'Please verify your email first. A new verification email has been sent.',
          needsVerification: true
        };
      }
      
      setCurrentUserId(userCredential.user.uid);
      
      // Sync data from Firebase
      try {
        await firebaseSync.mergeWithLocal();
      } catch (e) {
        console.log('Could not sync:', e);
      }
      
      return { 
        success: true, 
        user: userCredential.user,
        message: `Welcome back, ${userCredential.user.displayName || 'User'}!`
      };
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

  // Forgot password
  const forgotPassword = async (email) => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized.' };
    }

    if (!email) {
      return { success: false, error: 'Please enter your email address.' };
    }

    try {
      await sendPasswordResetEmail(auth, email);
      return { 
        success: true, 
        message: 'Password reset email sent! Please check your inbox.' 
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      let errorMessage = 'Failed to send reset email.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        default:
          errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  };

  // Resend verification email
  const resendVerificationEmail = async () => {
    if (!auth || !auth.currentUser) {
      return { success: false, error: 'No user logged in.' };
    }

    try {
      await sendEmailVerification(auth.currentUser);
      return { success: true, message: 'Verification email sent!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Log out
  const logOut = async () => {
    // Sync data before logout
    try {
      await firebaseSync.syncAllData();
    } catch (e) {
      console.log('Could not sync before logout:', e);
    }

    if (!auth) {
      setUser(null);
      setCurrentUserId(null);
      return { success: true, message: 'Logged out successfully!' };
    }

    try {
      await signOut(auth);
      setCurrentUserId(null);
      return { success: true, message: 'Logged out successfully!' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  // Google Sign-In
  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      return { success: false, error: 'Google Sign-In not available. Please use email/password.' };
    }

    try {
      if (Platform.OS === 'web') {
        const result = await signInWithPopup(auth, googleProvider);
        setCurrentUserId(result.user.uid);
        
        // Check if new user
        const isNewUser = result._tokenResponse?.isNewUser;
        
        return { 
          success: true, 
          user: result.user,
          isNewUser: isNewUser,
          message: isNewUser 
            ? `Welcome! Your account has been created with ${result.user.email}` 
            : `Welcome back, ${result.user.displayName || 'User'}!`
        };
      } else {
        // Mobile - Google Sign-In requires native SDK setup
        return { 
          success: false, 
          error: 'Google Sign-In on Android requires additional configuration.\n\nPlease use Email/Password login or Continue as Guest.',
          showAlternatives: true
        };
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      
      let errorMessage = 'Google Sign-In failed. Please try again.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      return { success: false, error: errorMessage };
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
      message: 'You are now using the app as a guest. Your data will be stored locally on this device only.'
    };
  };

  // Sync data manually
  const syncData = async () => {
    return await firebaseSync.syncAllData();
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
      syncData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
