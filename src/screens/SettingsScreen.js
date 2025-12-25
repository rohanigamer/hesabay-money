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
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Storage } from '../utils/Storage';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useAppLock } from '../context/AppLockContext';
import { CURRENCIES } from '../utils/Currency';
import BottomNavigation from '../components/BottomNavigation';
import GlassCard from '../components/GlassCard';
import { firebaseSync } from '../services/FirebaseSync';

export default function SettingsScreen({ navigation }) {
  const { colors, theme, changeTheme } = useContext(ThemeContext);
  const { currency, changeCurrency } = useCurrency();
  const { user, logOut, syncData } = useAuth();
  const { lockTimeout, updateLockTimeout, updateAuthMethod } = useAppLock();
  const [authMethod, setAuthMethod] = useState('none');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLockTimeoutModal, setShowLockTimeoutModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const sectionsAnim = useRef(new Animated.Value(0)).current;

  const lockTimeoutOptions = [
    { label: 'Immediately', value: 0 },
    { label: 'After 1 minute', value: 60 },
    { label: 'After 5 minutes', value: 300 },
    { label: 'After 15 minutes', value: 900 },
    { label: 'After 30 minutes', value: 1800 },
    { label: 'After 1 hour', value: 3600 },
  ];

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
      Alert.alert('🔓 Disable Passcode', 'Are you sure you want to disable passcode protection?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disable', 
          style: 'destructive', 
          onPress: async () => { 
            await Storage.deletePasscode(); 
            await Storage.setAuthMethod('none'); 
            updateAuthMethod('none');
            loadSettings(); 
            Alert.alert('✅ Done', 'Passcode has been disabled.');
          } 
        },
      ]);
    }
  };

  const handleBiometricToggle = async (enabled) => {
    if (enabled) {
      if (Platform.OS === 'web') return Alert.alert('⚠️ Not Available', 'Biometric authentication is not available on web.');
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) return Alert.alert('⚠️ Not Available', 'Your device does not support biometric authentication or has no biometrics enrolled.');
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric authentication' });
        if (result.success) { 
          await Storage.setAuthMethod('biometric'); 
          updateAuthMethod('biometric');
          loadSettings(); 
          Alert.alert('✅ Enabled', 'Biometric authentication has been enabled.');
        }
      } catch { 
        Alert.alert('❌ Error', 'Failed to enable biometric authentication.'); 
      }
    } else {
      Alert.alert('🔓 Disable Biometric', 'Are you sure you want to disable biometric protection?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Disable', 
          style: 'destructive', 
          onPress: async () => { 
            await Storage.setAuthMethod('none'); 
            updateAuthMethod('none');
            loadSettings(); 
            Alert.alert('✅ Done', 'Biometric authentication has been disabled.');
          } 
        },
      ]);
    }
  };

  const handleManualSync = async () => {
    if (!user || user.isGuest) {
      Alert.alert('⚠️ Guest Mode', 'Data sync is not available in guest mode. Please sign in to sync your data to the cloud.');
      return;
    }

    setSyncing(true);
    const result = await firebaseSync.syncAllData();
    setSyncing(false);

    if (result.success) {
      Alert.alert('✅ Sync Complete', 'Your data has been synced to the cloud.');
    } else if (result.pending) {
      Alert.alert('📴 Offline', 'You are currently offline. Data will sync automatically when you reconnect.');
    } else {
      Alert.alert('❌ Sync Failed', result.error || 'Could not sync data. Please try again.');
    }
  };

  const handleRefreshFromFirebase = async () => {
    if (!user || user.isGuest) {
      Alert.alert('⚠️ Guest Mode', 'Data refresh is not available in guest mode. Please sign in to access cloud data.');
      return;
    }

    // Confirm action
    const confirmAction = Platform.OS === 'web' 
      ? window.confirm('This will replace your local data with data from Firebase. Continue?')
      : await new Promise(resolve => {
          Alert.alert(
            '🔄 Refresh from Firebase',
            'This will replace your local data with the latest data from the cloud. Continue?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Refresh', style: 'default', onPress: () => resolve(true) }
            ]
          );
        });

    if (!confirmAction) return;

    setSyncing(true);
    const result = await firebaseSync.forceRefreshFromFirebase();
    setSyncing(false);

    if (result.success) {
      const message = Platform.OS === 'web'
        ? `Refreshed ${result.customersCount} customers and ${result.transactionsCount} transactions from Firebase.\n\nPlease refresh the page to see updated data.`
        : `Refreshed ${result.customersCount} customers and ${result.transactionsCount} transactions from Firebase.`;
      
      if (Platform.OS === 'web') {
        window.alert('✅ ' + message);
        window.location.reload();
      } else {
        Alert.alert('✅ Refresh Complete', message, [
          { text: 'OK', onPress: () => {
            // Navigate to Transaction screen to refresh the view
            navigation.navigate('Transaction');
          }}
        ]);
      }
    } else {
      const errorMsg = result.error || 'Could not refresh data. Please try again.';
      if (Platform.OS === 'web') {
        window.alert('❌ Refresh Failed: ' + errorMsg);
      } else {
        Alert.alert('❌ Refresh Failed', errorMsg);
      }
    }
  };

  const handleLogout = async () => {
    console.log('handleLogout called');
    
    // Use window.confirm for web, Alert for native
    const confirmLogout = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to sign out?')
      : await new Promise(resolve => {
          Alert.alert(
            '🚪 Sign Out',
            'Are you sure you want to sign out?',
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Sign Out', onPress: () => resolve(true), style: 'destructive' },
            ]
          );
        });

    if (!confirmLogout) {
      console.log('Logout cancelled');
      return;
    }

    console.log('Sign out confirmed, calling logOut...');
    try {
      const result = await logOut();
      console.log('Logout result:', result);
      
      if (result.success) {
        if (Platform.OS === 'web') {
          window.alert('Signed out successfully!');
        } else {
          Alert.alert('✅ Signed Out', 'You have been signed out successfully.');
        }
        console.log('Navigating to Login...');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        if (Platform.OS === 'web') {
          window.alert('Error: ' + (result.error || 'Could not sign out'));
        } else {
          Alert.alert('Error', result.error || 'Could not sign out');
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: Could not sign out. Please try again.');
      } else {
        Alert.alert('Error', 'Could not sign out. Please try again.');
      }
    }
  };

  const themeOptions = [
    { code: 'light', name: 'Light', icon: 'sunny' },
    { code: 'dark', name: 'Dark', icon: 'moon' },
    { code: 'device', name: 'System', icon: 'phone-portrait' },
  ];

  const Item = ({ icon, title, subtitle, right, onPress, last, iconColor }) => (
    <TouchableOpacity
      style={[styles.item, !last && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.iconBox, { backgroundColor: iconColor || colors.accent }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );

  const isGuest = user?.isGuest;

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
            {user && !isGuest ? (
              <>
                <Item
                  icon="person"
                  title={user.displayName || 'User'}
                  subtitle={user.email}
                />
                <Item
                  icon="cloud-upload"
                  title="Sync Data"
                  subtitle="Backup your data to cloud"
                  onPress={handleManualSync}
                  iconColor="#34C759"
                  right={
                    syncing ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    )
                  }
                />
                <Item
                  icon="cloud-download"
                  title="Refresh from Firebase"
                  subtitle="Get latest data from cloud"
                  onPress={handleRefreshFromFirebase}
                  iconColor="#007AFF"
                  right={
                    syncing ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    )
                  }
                />
                <Item
                  icon="log-out"
                  title="Sign Out"
                  subtitle="Log out from your account"
                  onPress={handleLogout}
                  last
                  iconColor="#FF3B30"
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
              </>
            ) : isGuest ? (
              <>
                <Item
                  icon="person"
                  title="Guest Mode"
                  subtitle="Data stored locally only"
                />
                <Item
                  icon="log-in"
                  title="Sign In"
                  subtitle="Sign in to sync your data"
                  onPress={() => {
                    Alert.alert(
                      '⚠️ Switch Account',
                      'If you sign in, your guest data will remain on this device. Would you like to continue?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Continue', onPress: () => navigation.navigate('Login') }
                      ]
                    );
                  }}
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
                <Item
                  icon="person-add"
                  title="Create Account"
                  subtitle="Sign up to sync across devices"
                  onPress={() => navigation.navigate('Signup')}
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

          {/* Sync Status (for logged in users) */}
          {user && !isGuest && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data Status</Text>
              <GlassCard style={[styles.statusCard, { backgroundColor: colors.surface }]}>
                <View style={styles.statusRow}>
                  <Ionicons name="cloud-done" size={24} color="#34C759" />
                  <View style={styles.statusInfo}>
                    <Text style={[styles.statusTitle, { color: colors.text }]}>Cloud Sync Active</Text>
                    <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
                      Data syncs automatically when online
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </>
          )}

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
              subtitle={authMethod === 'biometric' ? 'Enabled' : 'Disabled'}
              right={
                <Switch
                  value={authMethod === 'biometric'}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: colors.border, true: colors.accent }}
                />
              }
            />
            {(authMethod === 'passcode' || authMethod === 'biometric') && (
              <Item
                icon="time-outline"
                title="Auto-Lock"
                subtitle={lockTimeoutOptions.find(opt => opt.value === lockTimeout)?.label || 'Immediately'}
                onPress={() => setShowLockTimeoutModal(true)}
                last
                right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
              />
            )}
            {!(authMethod === 'passcode' || authMethod === 'biometric') && (
              <View style={{ height: 0 }} />
            )}
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

          {/* Help & Support */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Help & Support</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="logo-whatsapp"
              title="WhatsApp Support"
              subtitle="+93 790 285 355"
              iconColor="#25D366"
              onPress={() => {
                const url = 'https://wa.me/93790285355';
                Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
              }}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
            <Item
              icon="mail"
              title="Email Support"
              subtitle="rohanidgtl@gmail.com"
              iconColor="#FF5722"
              onPress={() => {
                const url = 'mailto:rohanidgtl@gmail.com?subject=Hesabay Money Support';
                Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open email'));
              }}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
            <Item
              icon="star"
              title="Rate App"
              subtitle="Share your feedback"
              iconColor="#FFB300"
              onPress={() => {
                Alert.alert(
                  '⭐ Rate Hesabay Money',
                  'Thank you for using Hesabay Money! Would you like to rate us on the Play Store?',
                  [
                    { text: 'Later', style: 'cancel' },
                    { 
                      text: 'Rate Now', 
                      onPress: () => {
                        // Replace with actual Play Store URL when published
                        const url = Platform.OS === 'ios' 
                          ? 'https://apps.apple.com' 
                          : 'https://play.google.com/store';
                        Linking.openURL(url).catch(() => {});
                      }
                    }
                  ]
                );
              }}
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
                onPress={() => { 
                  changeTheme(opt.code); 
                  setShowThemeModal(false); 
                  Alert.alert('✅ Theme Changed', `Theme set to ${opt.name}`);
                }}
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
                  onPress={() => { 
                    changeCurrency(curr.code); 
                    setShowCurrencyModal(false); 
                    Alert.alert('✅ Currency Changed', `Currency set to ${curr.name} (${curr.symbol})`);
                  }}
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

      {/* Lock Timeout Modal */}
      <Modal visible={showLockTimeoutModal} animationType="slide" transparent onRequestClose={() => setShowLockTimeoutModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowLockTimeoutModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Auto-Lock Timeout</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {lockTimeoutOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.themeOpt, { backgroundColor: lockTimeout === option.value ? colors.accentLight : colors.backgroundSecondary }]}
                  onPress={async () => { 
                    await updateLockTimeout(option.value); 
                    setShowLockTimeoutModal(false); 
                    Alert.alert('✅ Auto-Lock Updated', `App will lock ${option.label.toLowerCase()}`);
                  }}
                >
                  <Ionicons 
                    name="time-outline" 
                    size={22} 
                    color={lockTimeout === option.value ? colors.accent : colors.textSecondary} 
                  />
                  <Text style={[styles.themeOptText, { color: colors.text, flex: 1, marginLeft: 12 }]}>{option.label}</Text>
                  {lockTimeout === option.value && <Ionicons name="checkmark" size={20} color={colors.accent} />}
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
  statusCard: { marginBottom: 24, padding: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: '600' },
  statusSub: { fontSize: 12, marginTop: 2 },
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
