// App Lock Context - Handles biometric and passcode authentication
import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { Storage } from '../utils/Storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppLockContext = createContext();

const LOCK_TIMEOUT_KEY = '@lock_timeout';
const LAST_ACTIVE_KEY = '@last_active_time';

export const AppLockProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [authMethod, setAuthMethod] = useState('none');
  const [lockTimeout, setLockTimeout] = useState(0);
  const appState = useRef(AppState.currentState);
  const lastActiveTime = useRef(Date.now());
  // Refs for the AppState handler (avoids stale closures)
  const lockTimeoutRef = useRef(0);
  const authMethodRef = useRef('none');
  // Track when app actually went to background (not just inactive)
  const wentToBackgroundAt = useRef(null);

  useEffect(() => { lockTimeoutRef.current = lockTimeout; }, [lockTimeout]);
  useEffect(() => { authMethodRef.current = authMethod; }, [authMethod]);

  useEffect(() => {
    loadSettings();
    checkAuthMethod();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const timeout = await AsyncStorage.getItem(LOCK_TIMEOUT_KEY);
      if (timeout !== null) {
        const val = parseInt(timeout, 10);
        setLockTimeout(val);
        lockTimeoutRef.current = val;
      }
      // Also restore last active time in case app was killed
      const savedTime = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
      if (savedTime) {
        lastActiveTime.current = parseInt(savedTime, 10);
      }
    } catch (error) {
      console.error('Error loading lock settings:', error);
    }
  };

  const checkAuthMethod = async () => {
    try {
      const method = await Storage.getAuthMethod();
      const m = method || 'none';
      setAuthMethod(m);
      authMethodRef.current = m;

      if (m !== 'none') {
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Error checking auth method:', error);
    }
  };

  const handleAppStateChange = (nextAppState) => {
    const prev = appState.current;

    if (nextAppState === 'background') {
      // App actually went to background (not just inactive/notification center)
      wentToBackgroundAt.current = Date.now();
      lastActiveTime.current = Date.now();
      AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString()).catch(() => {});
    }

    if (prev === 'background' && nextAppState === 'active') {
      // Came back from actual background (not from inactive/notification pull)
      const method = authMethodRef.current;
      if (method && method !== 'none') {
        const backgroundTime = wentToBackgroundAt.current || lastActiveTime.current;
        const timePassed = (Date.now() - backgroundTime) / 1000;
        const timeout = lockTimeoutRef.current;

        if (timePassed >= timeout) {
          setIsLocked(true);
        }
      }
      wentToBackgroundAt.current = null;
    }

    // Also handle: inactive → active (e.g. notification center dismissed)
    // Don't lock for brief inactive states — only lock from actual background
    if (prev === 'inactive' && nextAppState === 'active' && wentToBackgroundAt.current) {
      // This means: inactive happened AFTER background, which is normal resume flow
      // Already handled above (prev === 'background' → 'active')
      // But some platforms go background → inactive → active
      const method = authMethodRef.current;
      if (method && method !== 'none') {
        const backgroundTime = wentToBackgroundAt.current;
        const timePassed = (Date.now() - backgroundTime) / 1000;
        const timeout = lockTimeoutRef.current;

        if (timePassed >= timeout) {
          setIsLocked(true);
        }
      }
      wentToBackgroundAt.current = null;
    }

    appState.current = nextAppState;
  };

  const unlock = useCallback(() => {
    setIsLocked(false);
    lastActiveTime.current = Date.now();
    wentToBackgroundAt.current = null;
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  const updateLockTimeout = async (seconds) => {
    try {
      await AsyncStorage.setItem(LOCK_TIMEOUT_KEY, seconds.toString());
      setLockTimeout(seconds);
      lockTimeoutRef.current = seconds;
    } catch (error) {
      console.error('Error updating lock timeout:', error);
    }
  };

  const updateAuthMethod = (method) => {
    setAuthMethod(method);
    authMethodRef.current = method;
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
