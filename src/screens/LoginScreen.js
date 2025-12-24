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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import PasswordStrength from '../components/PasswordStrength';

export default function LoginScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { signIn, signInWithGoogle, continueAsGuest, forgotPassword, firebaseInitialized } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Missing Information', 'Please enter your email address');
      return;
    }
    if (!password) {
      Alert.alert('Missing Information', 'Please enter your password');
      return;
    }

    setLoading(true);
    const result = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.success) {
      // Show success confirmation
      Alert.alert(
        '✅ Login Successful',
        result.message || 'Welcome back!',
        [{
          text: 'Continue',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Transaction' }],
            });
          }
        }]
      );
    } else if (result.needsVerification) {
      Alert.alert(
        '📧 Email Verification Required',
        result.error,
        [{ text: 'OK' }]
      );
    } else {
      // Check if it's a credential error - offer to sign up
      if (result.error && result.error.includes("don't have an account")) {
        Alert.alert(
          '❌ Login Failed',
          result.error,
          [
            { text: 'Sign Up', onPress: () => navigation.navigate('Signup') },
            { text: 'Try Again', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('❌ Login Failed', result.error);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Missing Information', 'Please enter your email address');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(resetEmail.trim().toLowerCase());
    setLoading(false);

    if (result.success) {
      Alert.alert(
        '📧 Email Sent',
        result.message,
        [{ text: 'OK', onPress: () => {
          setForgotPasswordModal(false);
          setResetEmail('');
        }}]
      );
    } else {
      Alert.alert('❌ Error', result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    
    if (result.success) {
      Alert.alert(
        result.isNewUser ? '🎉 Account Created' : '✅ Login Successful',
        result.message,
        [{
          text: 'Continue',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Transaction' }],
            });
          }
        }]
      );
    } else if (result.showAlternatives) {
      Alert.alert(
        '⚠️ Google Sign-In Not Available',
        result.error,
        [
          { text: 'Sign Up with Email', onPress: () => navigation.navigate('Signup') },
          { text: 'Continue as Guest', onPress: handleGuestLogin },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } else if (result.error) {
      Alert.alert('❌ Google Sign-In Failed', result.error);
    }
  };

  const handleGuestLogin = () => {
    const result = continueAsGuest();
    Alert.alert(
      '👤 Guest Mode',
      result.message,
      [{
        text: 'Continue',
        onPress: () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Transaction' }],
          });
        }
      }]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Connection Status */}
        {!firebaseInitialized && (
          <View style={[styles.connectionBanner, { backgroundColor: colors.accent + '20' }]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.connectionText, { color: colors.accent }]}>Connecting to server...</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="wallet" size={40} color={colors.accent} />
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
            style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={[styles.socialBtnText, { color: colors.text }]}>Continue with Google</Text>
          </TouchableOpacity>

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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>🔑 Reset Password</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            
            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 20 }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="your@email.com"
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
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Send Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  input: { flex: 1, fontSize: 16 },
  
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotPasswordText: { fontSize: 14, fontWeight: '500' },
  
  loginBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
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
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, lineHeight: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '600' },
});
