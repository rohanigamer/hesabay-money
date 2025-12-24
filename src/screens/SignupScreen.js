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
import PasswordStrength from '../components/PasswordStrength';

export default function SignupScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { signUp, signInWithGoogle } = useAuth();
  
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
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim().toLowerCase(), password, name.trim());
    setLoading(false);

    console.log('Sign up result:', result);

    if (result.success) {
      setStep(2); // Show verification sent screen
    } else {
      console.log('Showing error alert:', result.error);
      const errorMsg = result.error || 'An error occurred. Please try again.';
      if (Platform.OS === 'web') {
        window.alert('Sign Up Failed: ' + errorMsg);
      } else {
        Alert.alert('❌ Sign Up Failed', errorMsg, [{ text: 'OK' }]);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    
    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Transaction' }],
      });
    }
  };

  // Verification sent screen
  if (step === 2) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.verificationContainer}>
          <View style={[styles.iconCircle, { backgroundColor: '#4CAF50' + '20' }]}>
            <Ionicons name="mail-open" size={50} color="#4CAF50" />
          </View>
          
          <Text style={[styles.verificationTitle, { color: colors.text }]}>
            Verify Your Email
          </Text>
          
          <Text style={[styles.verificationText, { color: colors.textSecondary }]}>
            We've sent a verification link to:
          </Text>
          
          <Text style={[styles.verificationEmail, { color: colors.accent }]}>
            {email}
          </Text>
          
          <Text style={[styles.verificationText, { color: colors.textSecondary, marginTop: 20 }]}>
            Please check your inbox and click the verification link to complete your registration.
          </Text>

          <View style={styles.verificationNote}>
            <Ionicons name="information-circle" size={20} color={colors.textTertiary} />
            <Text style={[styles.noteText, { color: colors.textTertiary }]}>
              Don't see the email? Check your spam folder.
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.accent, marginTop: 30 }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginBtnText}>Go to Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.resendBtn}
            onPress={() => setStep(1)}
          >
            <Text style={[styles.resendBtnText, { color: colors.textSecondary }]}>
              Use a different email
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="person-add" size={40} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign up to start managing your finances
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="John Doe"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

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
                placeholder="At least 6 characters"
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
            <PasswordStrength password={password} colors={colors} />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              {confirmPassword && password === confirmPassword && (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              )}
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signupBtn, { backgroundColor: colors.accent }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signupBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={[styles.termsText, { color: colors.textTertiary }]}>
            By signing up, you agree to our Terms of Service and Privacy Policy
          </Text>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign Up */}
          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={[styles.socialBtnText, { color: colors.text }]}>Sign up with Google</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: colors.accent }]}>Sign In</Text>
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
  
  header: { alignItems: 'center', marginBottom: 30 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
  
  form: { width: '100%' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  input: { flex: 1, fontSize: 16 },
  
  signupBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  signupBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
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
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendBtn: { marginTop: 16 },
  resendBtnText: { fontSize: 14 },
});
