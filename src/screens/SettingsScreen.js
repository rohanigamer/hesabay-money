import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Storage } from '../utils/Storage';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES } from '../utils/Currency';
import BottomNavigation from '../components/BottomNavigation';
import GlassCard from '../components/GlassCard';
import FirebaseSync from '../services/FirebaseSync';

export default function SettingsScreen({ navigation }) {
  const { colors, theme, changeTheme } = useContext(ThemeContext);
  const { currency, changeCurrency } = useCurrency();
  const { user, logOut } = useAuth();
  const [authMethod, setAuthMethod] = useState('none');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const sectionsAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
      startAnimations();
    }, [])
  );

  const startAnimations = () => {
    headerAnim.setValue(0);
    sectionsAnim.setValue(0);
    Animated.stagger(80, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(sectionsAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const loadSettings = async () => setAuthMethod(await Storage.getAuthMethod() || 'none');

  const handlePasscodeToggle = (enabled) => {
    if (enabled) {
      navigation.navigate('PasscodeSetup', { isSettingUp: true, onPasscodeSet: loadSettings });
    } else {
      Alert.alert('Disable Passcode', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: async () => { await Storage.deletePasscode(); await Storage.setAuthMethod('none'); loadSettings(); } },
      ]);
    }
  };

  const handleBiometricToggle = async (enabled) => {
    if (enabled) {
      if (Platform.OS === 'web') return Alert.alert('Error', 'Not available on web');
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) return Alert.alert('Error', 'Biometric not available');
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric' });
        if (result.success) { await Storage.setAuthMethod('passkey'); loadSettings(); }
      } catch { Alert.alert('Error', 'Failed to enable'); }
    } else {
      Alert.alert('Disable Biometric', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: async () => { await Storage.setAuthMethod('none'); loadSettings(); } },
      ]);
    }
  };

  const themeOptions = [
    { code: 'light', name: 'Light', icon: 'sunny' },
    { code: 'dark', name: 'Dark', icon: 'moon' },
    { code: 'device', name: 'System', icon: 'phone-portrait' },
  ];

  const Item = ({ icon, title, subtitle, right, onPress, last }) => (
    <TouchableOpacity
      style={[styles.item, !last && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </Animated.View>

        <Animated.View style={{ opacity: sectionsAnim, transform: [{ translateY: sectionsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          {/* Account */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <GlassCard style={styles.section}>
            {user ? (
              <>
                <Item
                  icon="person"
                  title={user.displayName || 'User'}
                  subtitle={user.email}
                />
                <Item
                  icon="log-out"
                  title="Sign Out"
                  subtitle="Log out from your account"
                  onPress={async () => {
                    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Sign Out', 
                        style: 'destructive',
                        onPress: async () => {
                          FirebaseSync.stopRealtimeSync();
                          await logOut();
                        }
                      },
                    ]);
                  }}
                  last
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
              </>
            ) : (
              <>
                <Item
                  icon="log-in"
                  title="Sign In"
                  subtitle="Access your account"
                  onPress={() => navigation.navigate('Login')}
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
                <Item
                  icon="person-add"
                  title="Sign Up"
                  subtitle="Create a new account"
                  onPress={() => navigation.navigate('Signup')}
                  last
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
              </>
            )}
          </GlassCard>

          {/* Security */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="lock-closed"
              title="Passcode"
              subtitle={authMethod === 'passcode' ? 'Enabled' : 'Disabled'}
              right={
                <Switch
                  value={authMethod === 'passcode'}
                  onValueChange={handlePasscodeToggle}
                  trackColor={{ false: colors.border, true: colors.accent }}
                />
              }
            />
            <Item
              icon="finger-print"
              title="Biometric"
              subtitle={authMethod === 'passkey' ? 'Enabled' : 'Disabled'}
              last
              right={
                <Switch
                  value={authMethod === 'passkey'}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: colors.border, true: colors.accent }}
                />
              }
            />
          </GlassCard>

          {/* Appearance */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="contrast"
              title="Theme"
              subtitle={themeOptions.find(t => t.code === theme)?.name}
              onPress={() => setShowThemeModal(true)}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
            <Item
              icon="cash"
              title="Currency"
              subtitle={CURRENCIES.find(c => c.code === currency)?.name}
              onPress={() => setShowCurrencyModal(true)}
              last
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
          </GlassCard>

          {/* About */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
          <GlassCard style={styles.aboutCard}>
            <View style={[styles.logo, { backgroundColor: colors.accent }]}>
              <Text style={styles.logoText}>H</Text>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Hesabay Money</Text>
            <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
          </GlassCard>
        </Animated.View>
      </ScrollView>

      {/* Theme Modal */}
      <Modal visible={showThemeModal} animationType="slide" transparent onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowThemeModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Theme</Text>
            {themeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.code}
                style={[styles.themeOpt, { backgroundColor: theme === opt.code ? colors.accentLight : colors.backgroundSecondary }]}
                onPress={() => { changeTheme(opt.code); setShowThemeModal(false); }}
              >
                <Ionicons name={opt.icon} size={20} color={theme === opt.code ? colors.accent : colors.textSecondary} />
                <Text style={[styles.themeOptText, { color: colors.text }]}>{opt.name}</Text>
                {theme === opt.code && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal visible={showCurrencyModal} animationType="slide" transparent onRequestClose={() => setShowCurrencyModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCurrencyModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Currency</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[styles.themeOpt, { backgroundColor: currency === curr.code ? colors.accentLight : colors.backgroundSecondary }]}
                  onPress={() => { changeCurrency(curr.code); setShowCurrencyModal(false); }}
                >
                  <Text style={[styles.currencySymbol, { color: currency === curr.code ? colors.accent : colors.textSecondary }]}>
                    {curr.symbol}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.themeOptText, { color: colors.text }]}>{curr.name}</Text>
                    <Text style={[styles.currencyCode, { color: colors.textSecondary }]}>{curr.code}</Text>
                  </View>
                  {currency === curr.code && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomNavigation navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 120 },
  header: { marginBottom: 24 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  sectionTitle: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  section: { marginBottom: 24, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '500' },
  itemSub: { fontSize: 13, marginTop: 2 },
  aboutCard: { padding: 24, alignItems: 'center', marginBottom: 24 },
  logo: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  appName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  version: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  themeOpt: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  themeOptText: { flex: 1, fontSize: 16, fontWeight: '500' },
  currencySymbol: { fontSize: 24, fontWeight: '600', width: 40, textAlign: 'center' },
  currencyCode: { fontSize: 12, marginTop: 2 },
});
