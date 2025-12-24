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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function PhoneLoginScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { sendOTP, verifyOTP } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    // Format phone number with country code
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    setLoading(true);
    const result = await sendOTP(formattedPhone);
    setLoading(false);

    if (result.success) {
      setConfirmationResult(result.confirmationResult);
      setStep('otp');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    const result = await verifyOTP(confirmationResult, otp);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Verification Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="phone-portrait" size={40} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {step === 'phone' ? 'Phone Login' : 'Verify OTP'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 'phone' 
              ? 'Enter your phone number to receive OTP' 
              : `Enter the 6-digit code sent to ${phoneNumber}`}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {step === 'phone' ? (
            <>
              {/* Phone Number */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="call-outline" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="+1234567890"
                    placeholderTextColor={colors.textTertiary}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>
                <Text style={[styles.hint, { color: colors.textTertiary }]}>
                  Include country code (e.g., +1 for US)
                </Text>
              </View>

              {/* Send OTP Button */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Enter OTP</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: colors.text, letterSpacing: 8, fontSize: 24, fontWeight: '600' }]}
                    placeholder="000000"
                    placeholderTextColor={colors.textTertiary}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              {/* Resend OTP */}
              <TouchableOpacity 
                style={styles.resendBtn}
                onPress={() => { setStep('phone'); setOtp(''); }}
              >
                <Text style={[styles.resendText, { color: colors.accent }]}>
                  Change Phone Number
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Other Login Options */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="mail-outline" size={20} color={colors.text} />
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
              Sign in with Email
            </Text>
          </TouchableOpacity>
        </View>

        {/* reCAPTCHA container for web */}
        {Platform.OS === 'web' && <div id="recaptcha-container"></div>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  
  backBtn: { position: 'absolute', left: 24, top: Platform.OS === 'ios' ? 60 : 40, padding: 8, zIndex: 10 },
  
  header: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', maxWidth: 300 },
  
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  input: { flex: 1, fontSize: 16 },
  hint: { fontSize: 12, marginTop: 6 },
  
  actionBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 14, fontWeight: '600' },
  
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 14 },
  
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  secondaryBtnText: { fontSize: 15, fontWeight: '500' },
});

