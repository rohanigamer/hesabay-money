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
  Modal,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import { useFeedback } from '../context/FeedbackContext';
import KeyboardSpacer from '../components/KeyboardSpacer';
import i18n from '../utils/i18n';

export default function LoginScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, continueAsGuest, forgotPassword } = useAuth();
  const { toast, confirm, alert } = useFeedback();
  const passwordRef = useRef(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      toast({ type: 'warning', title: i18n.t('missingEmail'), message: i18n.t('missingEmailMsg') });
      return;
    }
    if (!password) {
      toast({ type: 'warning', title: i18n.t('missingPassword'), message: i18n.t('missingPasswordMsg') });
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      if (result.success) {
        toast({ type: 'success', title: i18n.t('welcome'), message: result.message || i18n.t('success') });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Transaction' }],
        });
      } else if (result.needsVerification) {
        await alert({ title: i18n.t('verifyYourEmail'), message: result.error, confirmText: i18n.t('ok') });
      } else {
        const errorMsg = result.error || 'Login failed. Please try again.';
        if (errorMsg.includes("don't have an account")) {
          const goToSignup = await confirm({
            title: i18n.t('accountNotFound'),
            message: `${errorMsg}\n\n${i18n.t('wouldYouLikeToSignUp')}`,
            confirmText: i18n.t('createAccount'),
            cancelText: i18n.t('tryAgain'),
          });
          if (goToSignup) navigation.navigate('Signup');
        } else {
          toast({ type: 'error', title: i18n.t('loginFailed'), message: errorMsg });
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      toast({ type: 'error', title: i18n.t('loginFailed'), message: err?.message || i18n.t('somethingWentWrong') });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      toast({ type: 'warning', title: i18n.t('missingEmail'), message: i18n.t('missingEmailMsg') });
      return;
    }

    setLoading(true);
    try {
      const result = await forgotPassword(resetEmail.trim().toLowerCase());
      if (result.success) {
        toast({ type: 'success', title: i18n.t('emailSent'), message: result.message });
        setForgotPasswordModal(false);
        setResetEmail('');
      } else {
        toast({ type: 'error', title: i18n.t('couldNotSendEmail'), message: result.error });
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      toast({ type: 'error', title: i18n.t('error'), message: err?.message || i18n.t('couldNotSendEmail') });
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
          title: i18n.t('googleSignInNotAvailable'),
          message: `${result.error}\n\n${i18n.t('useEmailInstead')}`,
          confirmText: i18n.t('signUpWithEmail'),
          cancelText: i18n.t('cancel'),
        });
        if (goEmail) navigation.navigate('Signup');
      } else if (result.error) {
        toast({ type: 'error', title: i18n.t('googleSignInFailed'), message: result.error });
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      toast({ type: 'error', title: i18n.t('error'), message: err?.message || i18n.t('googleSignInFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const result = continueAsGuest();
    toast({ type: 'info', title: i18n.t('guestMode'), message: result.message });
    navigation.reset({
      index: 0,
      routes: [{ name: 'Transaction' }],
    });
  };

  return (
    <AnimatedBackground>
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
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
          <Text style={[styles.title, { color: colors.text }]}>{i18n.t('appName')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {i18n.t('signInSubtitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('email')}</Text>
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
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
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
                ref={passwordRef}
                style={[styles.input, { color: colors.text }]}
                placeholder={i18n.t('passwordPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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
          </View>

          {/* Forgot Password */}
          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => {
              setResetEmail(email);
              setForgotPasswordModal(true);
            }}
            accessibilityRole="button"
          >
            <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>
              {i18n.t('forgotPassword')}
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('signIn')}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={[styles.loginBtnText, { color: colors.onAccent }]}>{i18n.t('signIn')}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{i18n.t('or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign In - Web Only */}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('continueWithGoogle')}
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={[styles.socialBtnText, { color: colors.text }]}>{i18n.t('continueWithGoogle')}</Text>
            </TouchableOpacity>
          )}

          {/* Continue as Guest */}
          <TouchableOpacity
            style={[styles.guestBtn, { borderColor: colors.border }]}
            onPress={handleGuestLogin}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('continueAsGuest')}
          >
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.guestBtnText, { color: colors.textSecondary }]}>{i18n.t('continueAsGuest')}</Text>
          </TouchableOpacity>

          {/* Guest Note */}
          <Text style={[styles.guestNote, { color: colors.textTertiary }]}>
            {i18n.t('guestNote')}
          </Text>

          {/* Sign Up Link */}
          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: colors.textSecondary }]}>
              {i18n.t('dontHaveAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')} accessibilityRole="link">
              <Text style={[styles.signupLink, { color: colors.accent }]}>{i18n.t('signUp') || i18n.t('createAccount')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotPasswordModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setForgotPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setForgotPasswordModal(false); }} activeOpacity={1} />
          <ScrollView
            contentContainerStyle={styles.forgotModalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>🔑 {i18n.t('resetPassword')}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {i18n.t('resetPasswordSubtitle')}
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
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{i18n.t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.onAccent} size="small" />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: colors.onAccent }]}>{i18n.t('sendLink')}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <KeyboardSpacer />
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  
  header: { alignItems: 'center', marginBottom: 36 },
  iconCircle: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  input: { flex: 1, fontSize: 16 },
  
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotPasswordText: { fontSize: 14, fontWeight: '600' },
  
  loginBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  loginBtnText: { fontSize: 16, fontWeight: '700' },
  
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14 },
  
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 12, marginBottom: 12 },
  socialBtnText: { fontSize: 15, fontWeight: '500' },
  
  guestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  guestBtnText: { fontSize: 15, fontWeight: '600' },
  
  guestNote: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  connectionBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginBottom: 20, gap: 10 },
  connectionText: { fontSize: 14, fontWeight: '500' },
  
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { fontSize: 14 },
  signupLink: { fontSize: 14, fontWeight: '600' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  forgotModalScroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 48 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 22, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, lineHeight: 21 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '700' },
});
