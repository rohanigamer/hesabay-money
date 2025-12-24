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
import { auth, googleProvider } from '../config/firebase';

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

  // Sign up with email verification
  const signUp = async (email, password, name) => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized. Please restart the app.' };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with name
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      
      // Send verification email
      await sendEmailVerification(userCredential.user);
      
      return { 
        success: true, 
        user: userCredential.user,
        message: 'Verification email sent! Please check your inbox.'
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
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        // Resend verification email
        await sendEmailVerification(userCredential.user);
        return { 
          success: false, 
          error: 'Please verify your email first. A new verification email has been sent.',
          needsVerification: true
        };
      }
      
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

  // Google Sign-In
  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      return { success: false, error: 'Google Sign-In not available.' };
    }

    try {
      if (Platform.OS === 'web') {
        const result = await signInWithPopup(auth, googleProvider);
        setCurrentUserId(result.user.uid);
        return { success: true, user: result.user };
      } else {
        Alert.alert(
          'Google Sign-In',
          'Google Sign-In on mobile requires additional setup. Please use email/password login.',
          [{ text: 'OK' }]
        );
        return { success: false, error: 'Use email/password on mobile' };
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      return { success: false, error: error.message || 'Google Sign-In failed' };
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
      continueAsGuest,
      forgotPassword,
      resendVerificationEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
