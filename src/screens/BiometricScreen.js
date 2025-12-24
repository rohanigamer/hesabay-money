import React, { useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { ThemeContext } from '../context/ThemeContext';

export default function BiometricScreen({ navigation, onSuccess }) {
  const { colors } = useContext(ThemeContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Auto authenticate on load
    setTimeout(authenticate, 500);
  }, []);

  const authenticate = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Error', 'Biometric not available on web');
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Biometric error:', error);
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={[styles.logo, { backgroundColor: colors.accent }]}>
          <Text style={styles.logoText}>H</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>Hesabay Money</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Use biometric to unlock</Text>

        {/* Biometric Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }]}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={authenticate}
            activeOpacity={0.7}
          >
            <Ionicons name="finger-print" size={56} color={colors.accent} />
          </TouchableOpacity>
        </Animated.View>

        {/* Tap to authenticate */}
        <Text style={[styles.hint, { color: colors.textTertiary }]}>Tap to authenticate</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  logo: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 48 },
  iconContainer: { marginBottom: 24 },
  iconButton: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 14 },
});
