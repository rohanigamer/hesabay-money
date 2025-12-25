// App Lock Context - Handles biometric and passcode authentication
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { Storage } from '../utils/Storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppLockContext = createContext();

const LOCK_TIMEOUT_KEY = '@lock_timeout';
const LAST_ACTIVE_KEY = '@last_active_time';

export const AppLockProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [authMethod, setAuthMethod] = useState('none');
  const [lockTimeout, setLockTimeout] = useState(0); // 0 = immediately, 60 = 1 min, 300 = 5 min, etc.
  const appState = useRef(AppState.currentState);
  const lastActiveTime = useRef(Date.now());

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    
    // Listen for app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Check auth method when it changes
  useEffect(() => {
    checkAuthMethod();
  }, []);

  const loadSettings = async () => {
    try {
      const timeout = await AsyncStorage.getItem(LOCK_TIMEOUT_KEY);
      if (timeout !== null) {
        setLockTimeout(parseInt(timeout));
      }
    } catch (error) {
      console.error('Error loading lock settings:', error);
    }
  };

  const checkAuthMethod = async () => {
    try {
      const method = await Storage.getAuthMethod();
      setAuthMethod(method || 'none');
      
      // If auth is enabled, lock the app initially
      if (method && method !== 'none') {
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Error checking auth method:', error);
    }
  };

  const handleAppStateChange = async (nextAppState) => {
    console.log('AppState changed from', appState.current, 'to', nextAppState);
    
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      console.log('App came to foreground');
      
      const method = await Storage.getAuthMethod();
      if (method && method !== 'none') {
        // Check if enough time has passed based on timeout setting
        const now = Date.now();
        const lastActive = lastActiveTime.current;
        const timePassed = (now - lastActive) / 1000; // in seconds
        
        console.log(`Time since last active: ${timePassed} seconds, timeout setting: ${lockTimeout} seconds`);
        
        if (timePassed >= lockTimeout) {
          console.log('Locking app due to timeout');
          setIsLocked(true);
        } else {
          console.log('Not locking - within timeout window');
        }
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background
      console.log('App went to background');
      lastActiveTime.current = Date.now();
      await AsyncStorage.setItem(LAST_ACTIVE_KEY, lastActiveTime.current.toString());
    }
    
    appState.current = nextAppState;
  };

  const unlock = () => {
    console.log('Unlocking app');
    setIsLocked(false);
    lastActiveTime.current = Date.now();
  };

  const lock = () => {
    console.log('Locking app');
    setIsLocked(true);
  };

  const updateLockTimeout = async (seconds) => {
    try {
      await AsyncStorage.setItem(LOCK_TIMEOUT_KEY, seconds.toString());
      setLockTimeout(seconds);
      console.log('Lock timeout updated to:', seconds, 'seconds');
    } catch (error) {
      console.error('Error updating lock timeout:', error);
    }
  };

  const updateAuthMethod = (method) => {
    setAuthMethod(method);
    if (method === 'none') {
      setIsLocked(false);
    }
  };

  return (
    <AppLockContext.Provider value={{
      isLocked,
      authMethod,
      lockTimeout,
      unlock,
      lock,
      updateLockTimeout,
      updateAuthMethod,
    }}>
      {children}
    </AppLockContext.Provider>
  );
};

export const useAppLock = () => useContext(AppLockContext);

