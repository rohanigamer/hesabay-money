import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

import { setCurrentUserId } from '../utils/Storage';

export default function LoginScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { signIn, signInWithGoogle } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.success) {
      // Navigate to app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Transaction' }],
      });
    } else {
      Alert.alert('Login Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="wallet" size={40} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to continue managing your finances
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={colors.textTertiary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.accent }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={async () => {
              setLoading(true);
              const result = await signInWithGoogle();
              setLoading(false);
              if (result.success) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Transaction' }],
                });
              } else if (result.error) {
                Alert.alert('Google Sign-In Failed', result.error);
              }
            }}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={[styles.googleBtnText, { color: colors.text }]}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Phone Login */}
          <TouchableOpacity
            style={[styles.phoneBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('PhoneLogin')}
          >
            <Ionicons name="call-outline" size={20} color={colors.accent} />
            <Text style={[styles.phoneBtnText, { color: colors.text }]}>Continue with Phone</Text>
          </TouchableOpacity>

          {/* Continue as Guest */}
          <TouchableOpacity
            style={[styles.guestBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => {
              // Set guest user ID
              setCurrentUserId('guest-user');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Transaction' }],
              });
            }}
          >
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.guestBtnText, { color: colors.textSecondary }]}>Continue as Guest</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={[styles.signupLink, { color: colors.accent }]}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
  
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  input: { flex: 1, fontSize: 16 },
  
  loginBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14 },
  
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 12, marginBottom: 12 },
  googleBtnText: { fontSize: 15, fontWeight: '500' },
  
  phoneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 12, marginBottom: 12 },
  phoneBtnText: { fontSize: 15, fontWeight: '500' },
  
  guestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  guestBtnText: { fontSize: 15, fontWeight: '500' },
  
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { fontSize: 14 },
  signupLink: { fontSize: 14, fontWeight: '600' },
});
