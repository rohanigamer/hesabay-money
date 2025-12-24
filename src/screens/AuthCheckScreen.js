import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/Storage';
import { ThemeContext } from '../context/ThemeContext';
import PasscodeScreen from './PasscodeScreen';
import BiometricScreen from './BiometricScreen';

const { width, height } = Dimensions.get('window');

export default function AuthCheckScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const [authMethod, setAuthMethod] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // iOS-style smooth animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    startAnimations();
    const timer = setTimeout(() => {
      setShowSplash(false);
      checkAuthMethod();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const startAnimations = () => {
    // Logo - iOS spring animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Title with delay
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Badge with delay
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(badgeTranslateY, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const checkAuthMethod = async () => {
    try {
      const method = await Storage.getAuthMethod();
      setAuthMethod(method);
      setIsChecking(false);
      if (method === 'none') {
        navigation.replace('Transaction');
      }
    } catch (error) {
      setIsChecking(false);
      navigation.replace('Transaction');
    }
  };

  const handleAuthSuccess = () => {
    navigation.replace('Transaction');
  };

  if (showSplash) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <View style={[styles.logo, { backgroundColor: colors.accent }]}>
              <Text style={styles.logoText}>H</Text>
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
          >
            <Text style={[styles.title, { color: colors.text }]}>Hesabay</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Money</Text>
          </Animated.View>
        </View>

        {/* Bottom Badge */}
        <Animated.View
          style={[
            styles.badge,
            {
              backgroundColor: colors.backgroundSecondary,
              opacity: badgeOpacity,
              transform: [{ translateY: badgeTranslateY }],
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>Secure & Private</Text>
        </Animated.View>
      </View>
    );
  }

  if (isChecking) return null;
  if (authMethod === 'passcode') return <PasscodeScreen navigation={navigation} onSuccess={handleAuthSuccess} />;
  if (authMethod === 'passkey') return <BiometricScreen navigation={navigation} onSuccess={handleAuthSuccess} />;
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 34,
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: -4,
  },
  badge: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
