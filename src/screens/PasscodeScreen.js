import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../utils/Storage';
import { ThemeContext } from '../context/ThemeContext';

export default function PasscodeScreen({ navigation, route, onSuccess }) {
  const { colors } = useContext(ThemeContext);
  const isSettingUp = route?.params?.isSettingUp;
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const shake = () => {
    if (Platform.OS !== 'web') Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
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
            await Storage.setPasscode(newCode);
            await Storage.setAuthMethod('passcode');
            if (route?.params?.onPasscodeSet) route.params.onPasscodeSet();
            navigation.goBack();
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

  const Dot = ({ filled }) => (
    <View style={[styles.dot, { borderColor: colors.text, backgroundColor: filled ? colors.text : 'transparent' }]} />
  );

  const Key = ({ num, onPress }) => (
    <TouchableOpacity
      style={[styles.key, { backgroundColor: colors.glass, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={[styles.keyText, { color: colors.text }]}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={[styles.logo, { backgroundColor: colors.accent }]}>
          <Text style={styles.logoText}>H</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {isSettingUp ? (isConfirming ? 'Confirm Passcode' : 'Create Passcode') : 'Enter Passcode'}
        </Text>

        {/* Dots */}
        <Animated.View style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}>
          {[0, 1, 2, 3].map((i) => <Dot key={i} filled={i < passcode.length} />)}
        </Animated.View>

        {/* Error */}
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : <View style={styles.errorPlaceholder} />}

        {/* Keypad */}
        <View style={styles.keypad}>
          <View style={styles.keyRow}>
            {['1', '2', '3'].map((n) => <Key key={n} num={n} onPress={() => handlePress(n)} />)}
          </View>
          <View style={styles.keyRow}>
            {['4', '5', '6'].map((n) => <Key key={n} num={n} onPress={() => handlePress(n)} />)}
          </View>
          <View style={styles.keyRow}>
            {['7', '8', '9'].map((n) => <Key key={n} num={n} onPress={() => handlePress(n)} />)}
          </View>
          <View style={styles.keyRow}>
            <View style={styles.keySpacer} />
            <Key num="0" onPress={() => handlePress('0')} />
            <TouchableOpacity style={styles.deleteKey} onPress={handleDelete} activeOpacity={0.6}>
              <Ionicons name="backspace-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cancel */}
        {isSettingUp && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelText, { color: colors.accent }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  logo: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  logoText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 32 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  error: { fontSize: 14, height: 20 },
  errorPlaceholder: { height: 20 },
  keypad: { marginTop: 32, gap: 12 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  key: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5 },
  keyText: { fontSize: 28, fontWeight: '400' },
  keySpacer: { width: 72, height: 72 },
  deleteKey: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { marginTop: 32 },
  cancelText: { fontSize: 16, fontWeight: '500' },
});
