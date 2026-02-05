// Firebase Auth REST API Wrapper for React Native
// This bypasses the Firebase SDK issues on React Native
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig, getFirebaseRestUrl, getSecureTokenUrl } from '../config/firebase';

const AUTH_STORAGE_KEY = '@firebase_auth_user';
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

class FirebaseAuthREST {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Load saved user from storage
    try {
      const savedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        console.log('✅ Loaded saved user from storage');
        this.notifyListeners(this.currentUser);
      }
    } catch (error) {
      console.error('Error loading saved user:', error);
    }
    
    this.initialized = true;
  }

  async signInWithEmailAndPassword(email, password) {
    try {
      const url = getFirebaseRestUrl('accounts:signInWithPassword');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Sign in failed');
      }

      const expiresIn = data.expiresIn || 3600;
      const user = {
        uid: data.localId,
        email: data.email,
        emailVerified: data.emailVerified || false,
        displayName: data.displayName || null,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresIn,
        tokenExpiry: Date.now() + expiresIn * 1000,
      };

      this.currentUser = user;
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      this.notifyListeners(user);

      return { user };
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async createUserWithEmailAndPassword(email, password) {
    try {
      const url = getFirebaseRestUrl('accounts:signUp');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Sign up failed');
      }

      const expiresIn = data.expiresIn || 3600;
      const user = {
        uid: data.localId,
        email: data.email,
        emailVerified: false,
        displayName: null,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresIn,
        tokenExpiry: Date.now() + expiresIn * 1000,
      };

      return { user };
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async sendEmailVerification(user) {
    try {
      const url = getFirebaseRestUrl('accounts:sendOobCode');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken: user.idToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send verification email');
      }

      return true;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async sendPasswordResetEmail(email) {
    try {
      const url = getFirebaseRestUrl('accounts:sendOobCode');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestType: 'PASSWORD_RESET',
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send password reset email');
      }

      return true;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async updateProfile(user, profile) {
    try {
      const url = getFirebaseRestUrl('accounts:update');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: user.idToken,
          displayName: profile.displayName,
          returnSecureToken: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update profile');
      }

      this.currentUser = {
        ...this.currentUser,
        displayName: data.displayName,
      };
      
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));
      this.notifyListeners(this.currentUser);

      return true;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  /**
   * Refresh ID token using refresh token. Call when token is expired or invalid.
   */
  async refreshIdToken() {
    let user = this.currentUser;
    if (!user) {
      try {
        const saved = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) user = JSON.parse(saved);
      } catch (e) {}
    }
    if (!user || !user.refreshToken) return null;
    try {
      const url = getSecureTokenUrl();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(user.refreshToken)}`,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Token refresh failed');
      const expiresIn = data.expires_in || 3600;
      const updated = {
        ...user,
        idToken: data.id_token,
        refreshToken: data.refresh_token || user.refreshToken,
        expiresIn,
        tokenExpiry: Date.now() + expiresIn * 1000,
      };
      this.currentUser = updated;
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      // Do not notify listeners - same user, only token refreshed; avoids resetting app navigation
      return updated.idToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Get a valid ID token for API calls. Refreshes if expired or forceRefresh.
   */
  async getIdToken(forceRefresh = false) {
    let user = this.currentUser;
    if (!user) {
      try {
        const saved = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) user = JSON.parse(saved);
      } catch (e) {}
    }
    if (!user || !user.idToken) return null;
    const now = Date.now();
    const expiry = user.tokenExpiry || 0;
    const isExpired = expiry - TOKEN_EXPIRY_BUFFER_MS <= now;
    if (!forceRefresh && !isExpired) return user.idToken;
    const fresh = await this.refreshIdToken();
    return fresh || user.idToken;
  }

  async signOut() {
    this.currentUser = null;
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    this.notifyListeners(null);
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    
    // Immediately call with current user
    if (this.initialized) {
      callback(this.currentUser);
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(user) {
    this.listeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Error in auth listener:', error);
      }
    });
  }

  formatError(error) {
    const message = error.message || 'An error occurred';
    
    // Map Firebase REST API error messages to standard error codes
    if (message.includes('EMAIL_NOT_FOUND') || message.includes('INVALID_PASSWORD')) {
      return { code: 'auth/invalid-credential', message: 'Invalid email or password' };
    }
    if (message.includes('EMAIL_EXISTS')) {
      return { code: 'auth/email-already-in-use', message: 'Email already in use' };
    }
    if (message.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
      return { code: 'auth/too-many-requests', message: 'Too many attempts. Try again later.' };
    }
    if (message.includes('INVALID_EMAIL')) {
      return { code: 'auth/invalid-email', message: 'Invalid email address' };
    }
    if (message.includes('WEAK_PASSWORD')) {
      return { code: 'auth/weak-password', message: 'Password should be at least 6 characters' };
    }
    
    return { code: 'auth/unknown', message };
  }
}

export const firebaseAuthREST = new FirebaseAuthREST();

