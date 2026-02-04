import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_HEIGHT } from '../constants/layout';
import { useFeedback } from '../context/FeedbackContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen({ navigation }) {
  const { colors, theme, changeTheme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { currency, changeCurrency } = useCurrency();
  const { user, logOut, syncData } = useAuth();
  const { lockTimeout, updateLockTimeout, updateAuthMethod } = useAppLock();
  const { toast, confirm, alert } = useFeedback();
  const [authMethod, setAuthMethod] = useState('none');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLockTimeoutModal, setShowLockTimeoutModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backupRestoreBusy, setBackupRestoreBusy] = useState(false);

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

  const handleBackupData = async () => {
    if (backupRestoreBusy) return;
    setBackupRestoreBusy(true);
    try {
      const jsonString = await Storage.exportBackup();
      if (!jsonString) {
        toast({ type: 'error', title: 'Backup failed', message: 'Could not export data.' });
        return;
      }
      const filename = 'Mbackup.Mbackup';
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonString], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast({ type: 'success', title: 'Backup saved', message: 'File saved as ' + filename });
      } else {
        const path = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(path, jsonString);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, { mimeType: 'application/octet-stream', dialogTitle: 'Save backup' });
          toast({ type: 'success', title: 'Backup ready', message: 'Share or save the file Mbackup.Mbackup' });
        } else {
          toast({ type: 'success', title: 'Backup saved', message: 'Saved to ' + path });
        }
      }
    } catch (e) {
      console.error('Backup error:', e);
      toast({ type: 'error', title: 'Backup failed', message: e.message || 'Could not create backup.' });
    } finally {
      setBackupRestoreBusy(false);
    }
  };

  const handleImportData = async () => {
    if (backupRestoreBusy) return;
    setBackupRestoreBusy(true);
    try {
      let content = null;
      if (Platform.OS === 'web') {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: false,
        });
        if (result.canceled) {
          setBackupRestoreBusy(false);
          return;
        }
        const asset = result.assets[0];
        if (asset.file) {
          content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(asset.file);
          });
        } else if (asset.uri) {
          const res = await fetch(asset.uri);
          content = await res.text();
        } else {
          throw new Error('Could not read file');
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });
        if (result.canceled) {
          setBackupRestoreBusy(false);
          return;
        }
        content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      }
      const importResult = await Storage.importBackup(content);
      if (importResult.success) {
        toast({
          type: 'success',
          title: 'Import complete',
          message: `Restored ${importResult.customers} customers and ${importResult.transactions} transactions.`,
        });
        navigation.navigate('Transaction');
      } else {
        toast({ type: 'error', title: 'Import failed', message: importResult.error || 'Invalid backup file.' });
      }
    } catch (e) {
      console.error('Import error:', e);
      toast({ type: 'error', title: 'Import failed', message: e.message || 'Could not read backup file.' });
    } finally {
      setBackupRestoreBusy(false);
    }
  };

  const handlePasscodeToggle = (enabled) => {
    if (enabled) {
      navigation.navigate('PasscodeSetup', { isSettingUp: true, onPasscodeSet: loadSettings });
    } else {
      (async () => {
        const ok = await confirm({
          title: 'Disable passcode?',
          message: 'Are you sure you want to disable passcode protection?',
          confirmText: 'Disable',
          cancelText: 'Cancel',
          destructive: true,
        });
        if (!ok) return;
        await Storage.deletePasscode();
        await Storage.setAuthMethod('none');
        updateAuthMethod('none');
        loadSettings();
        toast({ type: 'success', title: 'Updated', message: 'Passcode has been disabled.' });
      })();
    }
  };

  const handleBiometricToggle = async (enabled) => {
    if (enabled) {
      if (Platform.OS === 'web') {
        toast({ type: 'warning', title: 'Not available', message: 'Biometric authentication is not available on web.' });
        return;
      }
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          toast({
            type: 'warning',
            title: 'Not available',
            message: 'Your device does not support biometrics or none are enrolled.',
          });
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric authentication' });
        if (result.success) { 
          await Storage.setAuthMethod('biometric'); 
          updateAuthMethod('biometric');
          loadSettings(); 
          toast({ type: 'success', title: 'Enabled', message: 'Biometric authentication has been enabled.' });
        }
      } catch { 
        toast({ type: 'error', title: 'Error', message: 'Failed to enable biometric authentication.' });
      }
    } else {
      const ok = await confirm({
        title: 'Disable biometric?',
        message: 'Are you sure you want to disable biometric protection?',
        confirmText: 'Disable',
        cancelText: 'Cancel',
        destructive: true,
      });
      if (!ok) return;
      await Storage.setAuthMethod('none');
      updateAuthMethod('none');
      loadSettings();
      toast({ type: 'success', title: 'Updated', message: 'Biometric authentication has been disabled.' });
    }
  };

  const handleManualSync = async () => {
    if (!user || user.isGuest) {
      toast({ type: 'warning', title: 'Guest mode', message: 'Sign in to sync your data to the cloud.' });
      return;
    }

    setSyncing(true);
    const result = await firebaseSync.syncAllData();
    setSyncing(false);

    if (result.success) {
      toast({ type: 'success', title: 'Sync complete', message: 'Your data has been synced to the cloud.' });
    } else if (result.pending) {
      toast({ type: 'info', title: 'Offline', message: 'Data will sync automatically when you reconnect.' });
    } else {
      toast({ type: 'error', title: 'Sync failed', message: result.error || 'Could not sync data. Please try again.' });
    }
  };

  const handleRefreshFromFirebase = async () => {
    if (!user || user.isGuest) {
      toast({ type: 'warning', title: 'Guest mode', message: 'Sign in to access cloud data.' });
      return;
    }

    // Confirm action
    const confirmAction = await confirm({
      title: 'Refresh from cloud?',
      message: 'This will replace your local data with the latest data from the cloud.',
      confirmText: 'Refresh',
      cancelText: 'Cancel',
    });

    if (!confirmAction) return;

    setSyncing(true);
    const result = await firebaseSync.forceRefreshFromFirebase();
    setSyncing(false);

    if (result.success) {
      toast({
        type: 'success',
        title: 'Refresh complete',
        message: `Loaded ${result.customersCount} customers and ${result.transactionsCount} transactions.`,
      });
      navigation.navigate('Transaction');
    } else {
      const errorMsg = result.error || 'Could not refresh data. Please try again.';
      toast({ type: 'error', title: 'Refresh failed', message: errorMsg });
    }
  };

  const handlePasswordReset = async () => {
    if (!user || user.isGuest || !user.email) {
      toast({ type: 'error', title: 'Not available', message: 'No email address found for password reset.' });
      return;
    }

    try {
      // Import Firebase auth functions
      if (Platform.OS === 'web') {
        const { auth } = await import('../config/firebase');
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, user.email);
      } else {
        const { firebaseAuthREST } = await import('../services/FirebaseAuthREST');
        await firebaseAuthREST.sendPasswordResetEmail(user.email);
      }
      toast({ type: 'success', title: 'Email sent', message: 'Password reset email sent! Check your inbox.' });
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMsg = error.message || 'Failed to send password reset email.';
      toast({ type: 'error', title: 'Error', message: errorMsg });
    }
  };

  const handleLogout = async () => {
    console.log('handleLogout called');
    
    const confirmLogout = await confirm({
      title: 'Sign out?',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      destructive: true,
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
        toast({ type: 'success', title: 'Signed out', message: 'You have been signed out successfully.' });
        console.log('Navigating to Login...');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        toast({ type: 'error', title: 'Error', message: result.error || 'Could not sign out' });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({ type: 'error', title: 'Error', message: 'Could not sign out. Please try again.' });
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
        <Ionicons name={icon} size={18} color={colors.onAccent} />
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
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
                  icon="key"
                  title="Change Password"
                  subtitle="Update your password"
                  onPress={async () => {
                    const ok = await confirm({
                      title: 'Send password reset email?',
                      message: `A password reset link will be sent to ${user.email}.`,
                      confirmText: 'Send Link',
                      cancelText: 'Cancel',
                    });
                    if (ok) handlePasswordReset();
                  }}
                  iconColor={colors.warning}
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
                <Item
                  icon="cloud-upload"
                  title="Sync Data"
                  subtitle="Backup your data to cloud"
                  onPress={handleManualSync}
                  iconColor={colors.success}
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
                  iconColor={colors.accent}
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
                  iconColor={colors.error}
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
                    (async () => {
                      const ok = await confirm({
                        title: 'Switch account?',
                        message: 'If you sign in, your guest data will remain on this device.',
                        confirmText: 'Continue',
                        cancelText: 'Cancel',
                      });
                      if (ok) navigation.navigate('Login');
                    })();
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

          {/* Backup & restore - available to all */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Backup & restore</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="save-outline"
              title="Backup data"
              subtitle="Save to file Mbackup.Mbackup"
              onPress={handleBackupData}
              iconColor={colors.success}
              right={
                backupRestoreBusy ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                )
              }
            />
            <Item
              icon="document-attach-outline"
              title="Import backup"
              subtitle="Restore from Mbackup.Mbackup file"
              onPress={handleImportData}
              iconColor={colors.accent}
              last
              right={
                backupRestoreBusy ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                )
              }
            />
          </GlassCard>

          {/* Sync Status (for logged in users) */}
          {user && !isGuest && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data Status</Text>
              <GlassCard style={[styles.statusCard, { backgroundColor: colors.surface }]}>
                <View style={styles.statusRow}>
                  <Ionicons name="cloud-done" size={24} color={colors.success} />
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
              iconColor={colors.success}
              onPress={() => {
                const url = 'https://wa.me/93790285355';
                Linking.openURL(url).catch(() => toast({ type: 'error', title: 'Error', message: 'Could not open WhatsApp' }));
              }}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
            <Item
              icon="mail"
              title="Email Support"
              subtitle="rohanidgtl@gmail.com"
              iconColor={colors.warning}
              onPress={() => {
                const url = 'mailto:rohanidgtl@gmail.com?subject=Hesabay Money Support';
                Linking.openURL(url).catch(() => toast({ type: 'error', title: 'Error', message: 'Could not open email' }));
              }}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
            <Item
              icon="star"
              title="Rate App"
              subtitle="Share your feedback"
              iconColor={colors.warning}
              onPress={async () => {
                const ok = await confirm({
                  title: 'Rate Hesabay Money',
                  message: 'Would you like to rate us on the store?',
                  confirmText: 'Rate Now',
                  cancelText: 'Later',
                });
                if (!ok) return;
                const url = Platform.OS === 'ios' ? 'https://apps.apple.com' : 'https://play.google.com/store';
                Linking.openURL(url).catch(() => toast({ type: 'error', title: 'Error', message: 'Could not open store link' }));
              }}
              last
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
          </GlassCard>

          {/* About */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
          <GlassCard style={styles.aboutCard}>
            <View style={[styles.logo, { backgroundColor: colors.accent }]}>
              <Text style={[styles.logoText, { color: colors.onAccent }]}>H</Text>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Hesabay Money</Text>
            <Text style={[styles.version, { color: colors.textSecondary }]}>Version 2.0.0</Text>
          </GlassCard>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              Powered by{' '}
              <Text style={[styles.footerBrand, { color: colors.accent }]}>Rohani Digital</Text>
            </Text>
            <Text style={[styles.footerCopyright, { color: colors.textTertiary }]}>
              © 2025 All rights reserved
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Theme Modal */}
      <Modal visible={showThemeModal} animationType="slide" transparent onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowThemeModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Theme</Text>
            {themeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.code}
                style={[styles.themeOpt, { backgroundColor: theme === opt.code ? colors.accentLight : colors.backgroundSecondary }]}
                onPress={() => { 
                  changeTheme(opt.code); 
                  setShowThemeModal(false); 
                  toast({ type: 'success', title: 'Theme updated', message: `Theme set to ${opt.name}.` });
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
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Currency</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[styles.themeOpt, { backgroundColor: currency === curr.code ? colors.accentLight : colors.backgroundSecondary }]}
                  onPress={() => { 
                    changeCurrency(curr.code); 
                    setShowCurrencyModal(false); 
                    toast({ type: 'success', title: 'Currency updated', message: `Currency set to ${curr.name} (${curr.symbol}).` });
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
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Auto-Lock Timeout</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {lockTimeoutOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.themeOpt, { backgroundColor: lockTimeout === option.value ? colors.accentLight : colors.backgroundSecondary }]}
                  onPress={async () => { 
                    await updateLockTimeout(option.value); 
                    setShowLockTimeoutModal(false); 
                    toast({ type: 'success', title: 'Auto-lock updated', message: `App will lock ${option.label.toLowerCase()}.` });
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
  scrollContent: { padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 50 },
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
  logoText: { fontSize: 26, fontWeight: '700' },
  appName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  version: { fontSize: 13 },
  footer: { marginTop: 32, marginBottom: 16, alignItems: 'center', gap: 4 },
  footerText: { fontSize: 13, textAlign: 'center' },
  footerBrand: { fontWeight: '600' },
  footerCopyright: { fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  themeOpt: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  themeOptText: { flex: 1, fontSize: 16, fontWeight: '500' },
  currencySymbol: { fontSize: 24, fontWeight: '600', width: 40, textAlign: 'center' },
  currencyCode: { fontSize: 12, marginTop: 2 },
});
