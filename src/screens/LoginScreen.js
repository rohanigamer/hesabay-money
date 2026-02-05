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
  Modal,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import PasswordStrength from '../components/PasswordStrength';
import AnimatedBackground from '../components/AnimatedBackground';
import { useFeedback } from '../context/FeedbackContext';
import i18n from '../utils/i18n';

export default function LoginScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { signIn, signInWithGoogle, continueAsGuest, forgotPassword, firebaseInitialized } = useAuth();
  const { toast, confirm, alert } = useFeedback();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      toast({ type: 'warning', title: 'Missing email', message: 'Please enter your email address.' });
      return;
    }
    if (!password) {
      toast({ type: 'warning', title: 'Missing password', message: 'Please enter your password.' });
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      if (result.success) {
        toast({ type: 'success', title: 'Welcome', message: result.message || 'Login successful.' });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Transaction' }],
        });
      } else if (result.needsVerification) {
        await alert({ title: 'Email verification required', message: result.error, confirmText: 'OK' });
      } else {
        const errorMsg = result.error || 'Login failed. Please try again.';
        if (errorMsg.includes("don't have an account")) {
          const goToSignup = await confirm({
            title: 'Account not found',
            message: `${errorMsg}\n\nWould you like to create an account?`,
            confirmText: 'Sign Up',
            cancelText: 'Try Again',
          });
          if (goToSignup) navigation.navigate('Signup');
        } else {
          toast({ type: 'error', title: 'Login failed', message: errorMsg });
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      toast({ type: 'error', title: 'Login failed', message: err?.message || 'Something went wrong. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast({ type: 'warning', title: 'Missing email', message: 'Please enter your email address.' });
      return;
    }

    setLoading(true);
    try {
      const result = await forgotPassword(resetEmail.trim().toLowerCase());
      if (result.success) {
        toast({ type: 'success', title: 'Email sent', message: result.message });
        setForgotPasswordModal(false);
        setResetEmail('');
      } else {
        toast({ type: 'error', title: 'Could not send email', message: result.error });
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not send email.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        toast({ type: 'success', title: result.isNewUser ? 'Account created' : 'Logged in', message: result.message });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Transaction' }],
        });
      } else if (result.showAlternatives) {
        const goEmail = await confirm({
          title: 'Google Sign-In not available',
          message: `${result.error}\n\nUse email instead?`,
          confirmText: 'Sign up with Email',
          cancelText: 'Cancel',
        });
        if (goEmail) navigation.navigate('Signup');
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

  const handleGuestLogin = () => {
    const result = continueAsGuest();
    toast({ type: 'info', title: 'Guest mode', message: result.message });
    navigation.reset({
      index: 0,
      routes: [{ name: 'Transaction' }],
    });
  };

  return (
    <AnimatedBackground>
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Connection Status - only show briefly */}

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="wallet" size={44} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Hesabay Money</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to manage your finances
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
                placeholder={i18n.t('emailPlaceholder')}
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
                placeholder={i18n.t('passwordPlaceholder')}
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

          {/* Forgot Password */}
          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => {
              setResetEmail(email);
              setForgotPasswordModal(true);
            }}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.accent }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={[styles.loginBtnText, { color: colors.onAccent }]}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign In - Web Only */}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={[styles.socialBtnText, { color: colors.text }]}>Continue with Google</Text>
            </TouchableOpacity>
          )}

          {/* Continue as Guest */}
          <TouchableOpacity
            style={[styles.guestBtn, { borderColor: colors.border }]}
            onPress={handleGuestLogin}
          >
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.guestBtnText, { color: colors.textSecondary }]}>Continue as Guest</Text>
          </TouchableOpacity>

          {/* Guest Note */}
          <Text style={[styles.guestNote, { color: colors.textTertiary }]}>
            Guest data is stored locally only and won't sync across devices
          </Text>

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

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setForgotPasswordModal(false); }} activeOpacity={1} />
          <ScrollView
            contentContainerStyle={styles.forgotModalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>🔑 Reset Password</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              
              <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 20 }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={i18n.t('emailPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.border }]}
                  onPress={() => setForgotPasswordModal(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.onAccent} size="small" />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: colors.onAccent }]}>Send Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 80, justifyContent: 'center', minHeight: '100%' },
  
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', maxWidth: 280 },
  
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  input: { flex: 1, fontSize: 16 },
  
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotPasswordText: { fontSize: 14, fontWeight: '600' },
  
  loginBtn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  loginBtnText: { fontSize: 16, fontWeight: '600' },
  
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14 },
  
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 12, marginBottom: 12 },
  socialBtnText: { fontSize: 15, fontWeight: '500' },
  
  guestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  guestBtnText: { fontSize: 15, fontWeight: '500' },
  
  guestNote: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  connectionBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginBottom: 20, gap: 10 },
  connectionText: { fontSize: 14, fontWeight: '500' },
  
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { fontSize: 14 },
  signupLink: { fontSize: 14, fontWeight: '600' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  forgotModalScroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 48 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, lineHeight: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
});
