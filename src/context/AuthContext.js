import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform, Alert } from 'react-native';
import { setCurrentUserId } from '../utils/Storage';
import { isFirebaseReady, initializeFirebase, isWeb } from '../config/firebase';
import { firebaseAuthREST } from '../services/FirebaseAuthREST';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  // Initialize Firebase and set up auth listener
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const setupAuth = async () => {
      console.log(`🔄 AuthContext: Setting up auth for ${Platform.OS}...`);
      
      // Initialize Firebase
      await initializeFirebase();
      
      if (!isMounted) return;

      if (isWeb) {
        // Web: Use Firebase SDK
        console.log('📱 Web: Using Firebase SDK');
        
        if (!isFirebaseReady()) {
          console.error('❌ Firebase SDK not ready on web');
          setFirebaseInitialized(false);
          setLoading(false);
          return;
        }

        const { auth } = await import('../config/firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        
        console.log('✅ Setting up Firebase SDK auth listener');
        setFirebaseInitialized(true);

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
      } else {
        // Mobile: Use REST API
        console.log('📱 Mobile: Using Firebase REST API');
        
        await firebaseAuthREST.initialize();
        console.log('✅ Firebase REST API initialized');
        setFirebaseInitialized(true);

        unsubscribe = firebaseAuthREST.onAuthStateChanged(async (firebaseUser) => {
          if (!isMounted) return;
          
          console.log('🔔 Auth state changed:', firebaseUser ? `${firebaseUser.email} (verified: ${firebaseUser.emailVerified})` : 'logged out');
          
          if (firebaseUser) {
            setUser(firebaseUser);
            setCurrentUserId(firebaseUser.uid);
          } else {
            setUser(null);
            setCurrentUserId(null);
          }
          setLoading(false);
        });
      }
    };

    setupAuth();

    return () => {
      console.log('🧹 AuthContext: Cleanup');
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sign up with email verification
  const signUp = async (email, password, name) => {
    try {
      let userCredential;
      
      if (isWeb) {
        const { auth } = await import('../config/firebase');
        const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } = await import('firebase/auth');
        
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
        
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
      } else {
        userCredential = await firebaseAuthREST.createUserWithEmailAndPassword(email, password);
        
        if (name) {
          await firebaseAuthREST.updateProfile(userCredential.user, { displayName: name });
        }
        
        await firebaseAuthREST.sendEmailVerification(userCredential.user);
        await firebaseAuthREST.signOut();
      }
      
      setUser(null);
      setCurrentUserId(null);
      
      return { 
        success: true, 
        user: null,
        message: 'Account created! Please check your email to verify before logging in.'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  };

  // Sign in
  const signIn = async (email, password) => {
    try {
      let userCredential;
      
      if (isWeb) {
        const { auth } = await import('../config/firebase');
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await firebaseAuthREST.signInWithEmailAndPassword(email, password);
      }
      
      setCurrentUserId(userCredential.user.uid);
      
      // Load and merge Firebase data with local data
      console.log('📥 Loading user data from Firebase...');
      try {
        const { firebaseSync } = await import('../services/FirebaseSync');
        await firebaseSync.mergeWithLocal();
        console.log('✅ User data loaded successfully');
      } catch (e) {
        console.error('⚠️ Error loading user data:', e);
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
    if (!email) {
      return { success: false, error: 'Please enter your email address.' };
    }

    try {
      if (isWeb) {
        const { auth } = await import('../config/firebase');
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email);
      } else {
        await firebaseAuthREST.sendPasswordResetEmail(email);
      }
      
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
    if (!user) {
      return { success: false, error: 'No user logged in.' };
    }

    try {
      if (isWeb) {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(user);
      } else {
        await firebaseAuthREST.sendEmailVerification(user);
      }
      
      return { success: true, message: 'Verification email sent!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Log out
  const logOut = async () => {
    console.log('LogOut called');
    
    // Sync before logout
    try {
      const { firebaseSync } = await import('../services/FirebaseSync');
      await firebaseSync.syncAllData();
    } catch (e) {
      console.log('Sync error:', e);
    }

    try {
      if (isWeb) {
        const { auth } = await import('../config/firebase');
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
      } else {
        await firebaseAuthREST.signOut();
      }
      
      setUser(null);
      setCurrentUserId(null);
      return { success: true, message: 'Logged out successfully!' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  // Google Sign-In (web only)
  const signInWithGoogle = async () => {
    if (Platform.OS !== 'web') {
      return { 
        success: false, 
        error: 'Google Sign-In on mobile requires additional setup.\n\nPlease use Email/Password or Continue as Guest.',
        showAlternatives: true
      };
    }

    try {
      const { auth, googleProvider } = await import('../config/firebase');
      const { signInWithPopup } = await import('firebase/auth');
      
      const result = await signInWithPopup(auth, googleProvider);
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
