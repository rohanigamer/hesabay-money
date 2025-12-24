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

export default function SignupScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { signUp, signInWithGoogle } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, name);
    setLoading(false);

    if (result.success) {
      // Navigate to app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Transaction' }],
      });
    } else {
      Alert.alert('Signup Failed', result.error);
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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
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
          {/* Name */}
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
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Signup Button */}
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

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign Up */}
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
                Alert.alert('Google Sign-Up Failed', result.error);
              }
            }}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={[styles.googleBtnText, { color: colors.text }]}>Sign up with Google</Text>
          </TouchableOpacity>

          {/* Phone Sign Up */}
          <TouchableOpacity
            style={[styles.phoneBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('PhoneLogin')}
          >
            <Ionicons name="call-outline" size={20} color={colors.accent} />
            <Text style={[styles.phoneBtnText, { color: colors.text }]}>Sign up with Phone</Text>
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
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  
  header: { alignItems: 'center', marginBottom: 32 },
  backBtn: { position: 'absolute', left: 0, top: 0, padding: 8 },
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
  
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14 },
  
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 12, marginBottom: 12 },
  googleBtnText: { fontSize: 15, fontWeight: '500' },
  
  phoneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  phoneBtnText: { fontSize: 15, fontWeight: '500' },
  
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '600' },
});

