import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/Storage';
import { ThemeContext } from '../context/ThemeContext';
import { useAppLock } from '../context/AppLockContext';
import AnimatedBackground from '../components/AnimatedBackground';
import i18n from '../utils/i18n';

export default function PasscodeScreen({ navigation, route, onSuccess }) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { updateAuthMethod } = useAppLock();
  const isSettingUp = route?.params?.isSettingUp;
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const dotScale = useRef([0, 0, 0, 0].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    dotScale.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i < passcode.length ? 1 : 0,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }).start();
    });
  }, [passcode.length]);

  const shake = () => {
    if (Platform.OS !== 'web') Vibration.vibrate(80);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 18, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -18, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 12, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = async (num) => {
    if (passcode.length >= 4) return;
    const newCode = passcode + num;
    setPasscode(newCode);
    setError('');

    if (newCode.length === 4) {
      if (isSettingUp) {
        if (!isConfirming) {
          setConfirmPasscode(newCode);
          setIsConfirming(true);
          setPasscode('');
        } else {
          if (newCode === confirmPasscode) {
            try {
              const saved = await Storage.setPasscode(newCode);
              if (!saved) {
                setError('Could not save passcode. Try again.');
                setPasscode('');
                setConfirmPasscode('');
                setIsConfirming(false);
                return;
              }
              await Storage.setAuthMethod('passcode');
              updateAuthMethod('passcode');
              if (route?.params?.onPasscodeSet) route.params.onPasscodeSet();
              navigation.goBack();
            } catch (err) {
              console.error('Passcode setup error:', err);
              setError('Could not save. Try again.');
              setPasscode('');
              setConfirmPasscode('');
              setIsConfirming(false);
            }
          } else {
            shake();
            setError('Passcodes do not match');
            setPasscode('');
            setConfirmPasscode('');
            setIsConfirming(false);
          }
        }
      } else {
        const saved = await Storage.getPasscode();
        if (newCode === saved) {
          onSuccess?.();
        } else {
          shake();
          setError('Wrong passcode');
          setPasscode('');
        }
      }
    }
  };

  const handleDelete = () => {
    if (passcode.length > 0) {
      setPasscode(passcode.slice(0, -1));
      setError('');
    }
  };

  const radius = colors.radius?.md ?? 14;
  const keyRadius = 38;

  const Dot = ({ filled, index }) => (
    <Animated.View
      style={[
        styles.dotOuter,
        { borderColor: filled ? colors.accent : colors.border },
      ]}
    >
      <Animated.View
        style={[
          styles.dotInner,
          {
            backgroundColor: colors.accent,
            transform: [{ scale: dotScale[index] }],
          },
        ]}
      />
    </Animated.View>
  );

  const Key = ({ num, onPress }) => (
    <TouchableOpacity
      style={[
        styles.key,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: keyRadius,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={[styles.keyText, { color: colors.text }]}>{num}</Text>
    </TouchableOpacity>
  );

  const title = isSettingUp
    ? (isConfirming ? i18n.t('confirmYourPasscode') : i18n.t('createPasscodeTitle'))
    : i18n.t('enterYourPasscode');
  const subtitle = isSettingUp
    ? (isConfirming ? i18n.t('confirmPasscode') : i18n.t('passcode'))
    : i18n.t('appName');

  return (
    <AnimatedBackground>
      <Animated.View style={[styles.container, { opacity: fadeAnim, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
          {/* Logo */}
          <View style={[styles.logo, { backgroundColor: colors.accent, borderRadius: radius }]}>
            <Text style={[styles.logoText, { color: colors.onAccent }]}>H</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

          {/* Dots */}
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {[0, 1, 2, 3].map((i) => (
              <Dot key={i} filled={i < passcode.length} index={i} />
            ))}
          </Animated.View>

          {error ? (
            <View style={[styles.errorWrap, { backgroundColor: colors.error + '18' }]}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            </View>
          ) : (
            <View style={styles.errorPlaceholder} />
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            <View style={styles.keyRow}>
              {['1', '2', '3'].map((n) => (
                <Key key={n} num={n} onPress={() => handlePress(n)} />
              ))}
            </View>
            <View style={styles.keyRow}>
              {['4', '5', '6'].map((n) => (
                <Key key={n} num={n} onPress={() => handlePress(n)} />
              ))}
            </View>
            <View style={styles.keyRow}>
              {['7', '8', '9'].map((n) => (
                <Key key={n} num={n} onPress={() => handlePress(n)} />
              ))}
            </View>
            <View style={styles.keyRow}>
              <View style={styles.keySpacer} />
              <Key num="0" onPress={() => handlePress('0')} />
              <TouchableOpacity
                style={[styles.deleteKey, { backgroundColor: colors.surface, borderRadius: keyRadius }]}
                onPress={handleDelete}
                activeOpacity={0.6}
              >
                <Ionicons name="backspace-outline" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {isSettingUp && (
            <TouchableOpacity
              style={[styles.cancelBtn, { marginTop: 28 }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.cancelText, { color: colors.accent }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
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
    paddingHorizontal: 36,
  },
  logo: {
    width: 68,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  logoText: {
    fontSize: 34,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  dotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  error: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorPlaceholder: {
    height: 42,
    marginBottom: 8,
  },
  keypad: {
    marginTop: 16,
    gap: 16,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  key: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  keyText: {
    fontSize: 30,
    fontWeight: '600',
  },
  keySpacer: {
    width: 76,
    height: 76,
  },
  deleteKey: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {},
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
