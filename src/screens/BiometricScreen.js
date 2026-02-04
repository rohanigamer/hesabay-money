import React, { useEffect, useContext, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { ThemeContext } from '../context/ThemeContext';
import { useFeedback } from '../context/FeedbackContext';
import AnimatedBackground from '../components/AnimatedBackground';

export default function BiometricScreen({ navigation, onSuccess }) {
  const { colors } = useContext(ThemeContext);
  const { toast } = useFeedback();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const runSuccessAnimation = (callback) => {
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 450);
  };

  const authenticate = async () => {
    if (Platform.OS === 'web') {
      toast({ type: 'warning', title: 'Not available', message: 'Biometric authentication is not available on web.' });
      return;
    }
    if (isAuthenticating) return;
    setIsAuthenticating(true);

    // Subtle ring feedback on tap
    Animated.sequence([
      Animated.timing(ringScale, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.spring(ringScale, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Hesabay Money',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        runSuccessAnimation(() => onSuccess?.());
      } else {
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error('Biometric error:', error);
      setIsAuthenticating(false);
    }
  };

  const radius = colors.radius?.xl ?? 24;

  return (
    <AnimatedBackground>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoWrap,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={[styles.logo, { backgroundColor: colors.accent, borderRadius: radius }]}>
              <Text style={[styles.logoText, { color: colors.onAccent }]}>H</Text>
            </View>
          </Animated.View>

          <Text style={[styles.title, { color: colors.text }]}>Hesabay Money</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Use your fingerprint or face to unlock
          </Text>

          {/* Biometric button with ring */}
          <Animated.View
            style={[
              styles.iconWrap,
              {
                transform: [
                  { scale: Animated.multiply(scaleAnim, pulseAnim) },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.ring,
                {
                  borderColor: colors.accent + '40',
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.surface, borderRadius: radius * 2 }]}
              onPress={authenticate}
              activeOpacity={0.8}
              disabled={isAuthenticating}
            >
              <Ionicons name="finger-print" size={64} color={colors.accent} />
            </TouchableOpacity>
            {/* Success checkmark overlay */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.successOverlay,
                {
                  backgroundColor: colors.success + '20',
                  borderRadius: radius * 2,
                  opacity: successOpacity,
                  transform: [{ scale: successScale }],
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={72} color={colors.success} />
            </Animated.View>
          </Animated.View>

          <Text style={[styles.hint, { color: colors.textTertiary }]}>Tap to authenticate</Text>
          <View style={[styles.badge, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
            <Text style={[styles.badgeText, { color: colors.accent }]}>Secure & private</Text>
          </View>
        </View>
      </Animated.View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    marginBottom: 20,
  },
  logo: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: 24,
  },
  iconWrap: {
    position: 'relative',
    marginBottom: 28,
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    top: -10,
    left: -10,
  },
  iconButton: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: 140,
    height: 140,
    left: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
