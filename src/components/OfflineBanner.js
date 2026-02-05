import React, { useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useSyncStatus } from '../context/SyncStatusContext';
import i18n from '../utils/i18n';

export default function OfflineBanner() {
  const { colors } = useContext(ThemeContext);
  const { isOnline, isSyncing } = useSyncStatus();
  const insets = useSafeAreaInsets();

  if (isOnline && !isSyncing) return null;

  const message = isSyncing ? i18n.t('syncingMessage') : i18n.t('offlineMessage');
  const bgColor = isSyncing ? colors.accent : colors.warning || '#E65100';

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: bgColor + 'EE',
          paddingTop: Math.max(insets.top, 8) + 6,
          paddingBottom: 8,
        },
      ]}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
      ) : (
        <Ionicons name="cloud-offline" size={18} color="#fff" style={styles.icon} />
      )}
      <Text style={styles.text} numberOfLines={1}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 8,
  },
  spinner: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
