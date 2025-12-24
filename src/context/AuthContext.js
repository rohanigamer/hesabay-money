import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { setCurrentUserId } from '../utils/Storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  signInWithPhoneNumber
} from 'firebase/auth';
import { auth, googleProvider, GoogleAuthProvider, signInWithCredential } from '../config/firebase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  
  // Google Sign-In for mobile
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '350936013602-f84b5dochl4gk80temmacabe1sr9batc.apps.googleusercontent.com',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setCurrentUserId(user?.uid || null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with name
      await updateProfile(userCredential.user, {
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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setCurrentUserId(userCredential.user.uid);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  };

  const logOut = async () => {
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
    try {
      if (Platform.OS === 'web') {
        // Web: Use Firebase popup
        const result = await signInWithPopup(auth, googleProvider);
        setCurrentUserId(result.user.uid);
        return { success: true, user: result.user };
      } else {
        // Mobile: Use expo-auth-session
        const result = await promptAsync();
        
        if (result?.type === 'success' && result.params.id_token) {
          // Sign in to Firebase with Google credential
          const credential = GoogleAuthProvider.credential(result.params.id_token);
          const userCredential = await signInWithCredential(auth, credential);
          setCurrentUserId(userCredential.user.uid);
          return { success: true, user: userCredential.user };
        }
        
        return { success: false, error: 'Google Sign-In was cancelled' };
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      return { success: false, error: error.message || 'Google Sign-In failed' };
    }
  };

  const setupRecaptcha = (containerId = 'recaptcha-container') => {
    if (Platform.OS === 'web' && !recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response) => {
          console.log('reCAPTCHA solved');
        }
      });
      setRecaptchaVerifier(verifier);
      return verifier;
    }
    return recaptchaVerifier;
  };

  const sendOTP = async (phoneNumber) => {
    try {
      if (Platform.OS === 'web') {
        const verifier = setupRecaptcha();
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        return { success: true, confirmationResult };
      } else {
        // For mobile, you'll need to use Firebase Phone Auth with native modules
        // This requires additional setup with expo-firebase-recaptcha
        return { success: false, error: 'Phone auth on mobile requires additional setup' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const verifyOTP = async (confirmationResult, code) => {
    try {
      const result = await confirmationResult.confirm(code);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
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
      sendOTP,
      verifyOTP,
      setupRecaptcha
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

