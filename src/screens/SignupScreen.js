import React, { useState, useContext, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import PasswordStrength from '../components/PasswordStrength';
import AnimatedBackground from '../components/AnimatedBackground';
import { useFeedback } from '../context/FeedbackContext';
import i18n from '../utils/i18n';

export default function SignupScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { signUp, signInWithGoogle } = useAuth();
  const { toast } = useFeedback();
  const emailRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Verification sent

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    // Validation
    if (!name.trim()) {
      toast({ type: 'warning', title: 'Missing name', message: 'Please enter your full name.' });
      return;
    }
    if (!email.trim()) {
      toast({ type: 'warning', title: 'Missing email', message: 'Please enter your email address.' });
      return;
    }
    if (!validateEmail(email.trim())) {
      toast({ type: 'warning', title: 'Invalid email', message: 'Please enter a valid email address.' });
      return;
    }
    if (!password) {
      toast({ type: 'warning', title: 'Missing password', message: 'Please enter a password.' });
      return;
    }
    if (password.length < 6) {
      toast({ type: 'warning', title: 'Weak password', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ type: 'warning', title: 'Passwords do not match', message: 'Please re-check your password.' });
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email.trim().toLowerCase(), password, name.trim());
      if (result.success) {
        setStep(2); // Show verification sent screen
        toast({ type: 'success', title: 'Check your email', message: result.message || 'Verification link sent.' });
      } else {
        const errorMsg = result.error || 'An error occurred. Please try again.';
        toast({ type: 'error', title: 'Sign up failed', message: errorMsg });
      }
    } catch (err) {
      console.error('Sign up error:', err);
      toast({ type: 'error', title: 'Sign up failed', message: err?.message || 'Something went wrong. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Transaction' }],
        });
      } else if (result.error) {
        toast({ type: 'error', title: 'Google Sign-In failed', message: result.error });
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Google Sign-In failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Verification sent screen
  if (step === 2) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.verificationContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="mail-open" size={50} color={colors.success} />
          </View>
          
          <Text style={[styles.verificationTitle, { color: colors.text }]}>
            {i18n.t('verifyYourEmail')}
          </Text>
          
          <Text style={[styles.verificationText, { color: colors.textSecondary }]}>
            {i18n.t('verificationSentTo')}
          </Text>
          
          <Text style={[styles.verificationEmail, { color: colors.accent }]}>
            {email}
          </Text>
          
          <Text style={[styles.verificationText, { color: colors.textSecondary, marginTop: 20 }]}>
            {i18n.t('verificationInstructions')}
          </Text>

          <View style={styles.verificationNote}>
            <Ionicons name="information-circle" size={20} color={colors.textTertiary} />
            <Text style={[styles.noteText, { color: colors.textTertiary }]}>
              {i18n.t('checkSpamFolder')}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.accent, marginTop: 30 }]}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
          >
            <Text style={[styles.loginBtnText, { color: colors.onAccent }]}>{i18n.t('goToLogin')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.resendBtn}
            onPress={() => setStep(1)}
            accessibilityRole="button"
          >
            <Text style={[styles.resendBtnText, { color: colors.textSecondary }]}>
              {i18n.t('useDifferentEmail')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <AnimatedBackground>
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 12) + 24, paddingBottom: Math.max(insets.bottom, 24) + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="person-add" size={44} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{i18n.t('createAccount')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {i18n.t('signUpSubtitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('fullName')}</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={i18n.t('namePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                accessibilityLabel={i18n.t('fullName')}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('email')}</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
              <TextInput
                ref={emailRef}
                style={[styles.input, { color: colors.text }]}
                placeholder={i18n.t('emailPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                accessibilityLabel={i18n.t('email')}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('password')}</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, { color: colors.text }]}
                placeholder={i18n.t('passwordMinPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                accessibilityLabel={i18n.t('password')}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={colors.textTertiary} 
                />
              </TouchableOpacity>
            </View>
            <PasswordStrength password={password} colors={colors} />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('confirmPassword')}</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border, borderColor: confirmPassword && password !== confirmPassword ? colors.error : colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
              <TextInput
                ref={confirmPasswordRef}
                style={[styles.input, { color: colors.text }]}
                placeholder={i18n.t('confirmPasswordPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                accessibilityLabel={i18n.t('confirmPassword')}
              />
              {confirmPassword && password === confirmPassword && (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              )}
              {confirmPassword && password !== confirmPassword && (
                <Ionicons name="close-circle" size={20} color={colors.error} />
              )}
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signupBtn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSignup}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('createAccount')}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={[styles.signupBtnText, { color: colors.onAccent }]}>{i18n.t('createAccount')}</Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={[styles.termsText, { color: colors.textTertiary }]}>
            {i18n.t('termsAgree')}
          </Text>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{i18n.t('or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign Up - Web Only */}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('signUpWithGoogle')}
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={[styles.socialBtnText, { color: colors.text }]}>{i18n.t('signUpWithGoogle')}</Text>
            </TouchableOpacity>
          )}

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              {i18n.t('alreadyHaveAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityRole="link">
              <Text style={[styles.loginLink, { color: colors.accent }]}>{i18n.t('signIn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  
  header: { alignItems: 'center', marginBottom: 30 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', maxWidth: 280 },
  
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  input: { flex: 1, fontSize: 16 },
  
  signupBtn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  signupBtnText: { fontSize: 16, fontWeight: '600' },
  
  termsText: { fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14 },
  
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  socialBtnText: { fontSize: 15, fontWeight: '500' },
  
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '600' },

  // Verification screen
  verificationContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  verificationTitle: { fontSize: 24, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  verificationText: { fontSize: 15, textAlign: 'center', maxWidth: 300 },
  verificationEmail: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  verificationNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, padding: 16, backgroundColor: 'rgba(128,128,128,0.1)', borderRadius: 12 },
  noteText: { fontSize: 13, flex: 1 },
  loginBtn: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center', width: '100%' },
  loginBtnText: { fontSize: 16, fontWeight: '600' },
  resendBtn: { marginTop: 16 },
  resendBtnText: { fontSize: 14 },
});
