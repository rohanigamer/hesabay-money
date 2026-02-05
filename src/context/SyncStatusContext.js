import React, { createContext, useContext, useEffect, useState } from 'react';
import { firebaseSync } from '../services/FirebaseSync';

const SyncStatusContext = createContext({ isOnline: true, isSyncing: false });

export function SyncStatusProvider({ children }) {
  const [status, setStatus] = useState({
    isOnline: firebaseSync.isOnline,
    isSyncing: firebaseSync.syncInProgress,
  });

  useEffect(() => {
    const handler = ({ isOnline, syncInProgress }) => {
      setStatus({ isOnline, isSyncing: syncInProgress });
    };
    firebaseSync.setStatusListener(handler);
    return () => firebaseSync.clearStatusListener();
  }, []);

  return (
    <SyncStatusContext.Provider value={status}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus() {
  return useContext(SyncStatusContext);
}
