import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useSyncStatus } from '../context/SyncStatusContext';
import i18n from '../utils/i18n';

export default function OfflineBanner() {
  const { colors } = useContext(ThemeContext);
  const { isOnline, isSyncing } = useSyncStatus();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isVisible = !isOnline || isSyncing;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -60, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const message = isSyncing ? i18n.t('syncingMessage') : i18n.t('offlineMessage');
  const bgColor = isSyncing ? colors.accent : colors.warning || '#E65100';

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: bgColor + 'EE',
          paddingTop: Math.max(insets.top, 8) + 6,
          paddingBottom: 8,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
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
    </Animated.View>
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
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
