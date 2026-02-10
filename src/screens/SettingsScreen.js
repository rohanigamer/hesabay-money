import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Switch,
  Modal,
  Platform,
  Animated,
  ActivityIndicator,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Storage } from '../utils/Storage';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useAppLock } from '../context/AppLockContext';
import { CURRENCIES, DEFAULT_CURRENCY } from '../utils/Currency';
import KeyboardSpacer from '../components/KeyboardSpacer';
import BottomNavigation from '../components/BottomNavigation';
import GlassCard from '../components/GlassCard';
import OfflineBanner from '../components/OfflineBanner';
import { firebaseSync } from '../services/FirebaseSync';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_HEIGHT } from '../constants/layout';
import { useFeedback } from '../context/FeedbackContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import i18n, { LANGUAGES } from '../utils/i18n';
import { useLanguage } from '../context/LanguageContext';
import { getPrivacyPolicyUrl, getRateAppUrl } from '../config/appLinks';

export default function SettingsScreen({ navigation }) {
  const { colors, theme, changeTheme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { wallets, walletBalances, addWallet, updateWallet, removeWallet, loadWallets, format, refreshBalances, exchangeRates, loadExchangeRates } = useCurrency();
  const { user, logOut } = useAuth();
  const { lockTimeout, updateLockTimeout, updateAuthMethod } = useAppLock();
  const { language, changeLanguage } = useLanguage();
  const { toast, confirm, alert, showError } = useFeedback();
  const [authMethod, setAuthMethod] = useState('none');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [showEditWalletModal, setShowEditWalletModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [walletForm, setWalletForm] = useState({ currencyCode: '', initialBalance: '' });
  const [showLockTimeoutModal, setShowLockTimeoutModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backupRestoreBusy, setBackupRestoreBusy] = useState(false);
  const [removingWalletId, setRemovingWalletId] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllVerification, setDeleteAllVerification] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const [showExchangeRatesModal, setShowExchangeRatesModal] = useState(false);
  const [exchangeRateForm, setExchangeRateForm] = useState({ baseCurrency: DEFAULT_CURRENCY, rates: {} });
  const [savingRates, setSavingRates] = useState(false);
  const [walletToRemove, setWalletToRemove] = useState(null);
  const [showRemoveCurrencyOptionsModal, setShowRemoveCurrencyOptionsModal] = useState(false);
  const [showConvertCurrencyModal, setShowConvertCurrencyModal] = useState(false);
  const [convertTargetCurrency, setConvertTargetCurrency] = useState('');
  const [convertRate, setConvertRate] = useState('');
  const [convertingOrDeleting, setConvertingOrDeleting] = useState(false);
  const [addWalletSubmitting, setAddWalletSubmitting] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const sectionsAnim = useRef(new Animated.Value(0)).current;

  const lockTimeoutOptions = [
    { label: i18n.t('immediately'), value: 0 },
    { label: `1 ${i18n.t('minute')}`, value: 60 },
    { label: `5 ${i18n.t('minutes')}`, value: 300 },
    { label: `15 ${i18n.t('minutes')}`, value: 900 },
    { label: `30 ${i18n.t('minutes')}`, value: 1800 },
    { label: `1 ${i18n.t('hour')}`, value: 3600 },
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
        toast({ type: 'error', title: i18n.t('backupFailed'), message: i18n.t('couldNotExportData') });
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
        toast({ type: 'success', title: i18n.t('backupSaved'), message: i18n.t('fileSavedTo') + filename });
      } else {
        const path = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(path, jsonString);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(path, { mimeType: 'application/octet-stream', dialogTitle: i18n.t('backupSaved') });
          toast({ type: 'success', title: i18n.t('backupReady'), message: i18n.t('saveBackupFile') });
        } else {
          toast({ type: 'success', title: i18n.t('backupSaved'), message: i18n.t('savedTo') + path });
        }
      }
    } catch (e) {
      console.error('Backup error:', e);
      toast({ type: 'error', title: i18n.t('backupFailed'), message: e.message || i18n.t('couldNotExportData') });
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
          title: i18n.t('importComplete'),
          message: i18n.t('restoredCount').replace('{customers}', importResult.customers).replace('{transactions}', importResult.transactions),
        });
        navigation.navigate('Transaction');
      } else {
        toast({ type: 'error', title: i18n.t('importFailed'), message: importResult.error || i18n.t('invalidBackupFile') });
      }
    } catch (e) {
      console.error('Import error:', e);
      toast({ type: 'error', title: i18n.t('importFailed'), message: e.message || i18n.t('couldNotReadBackup') });
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
          title: i18n.t('disablePasscodeQuestion'),
          message: i18n.t('disablePasscodeConfirm'),
          confirmText: i18n.t('disable'),
          cancelText: i18n.t('cancel'),
          destructive: true,
        });
        if (!ok) return;
        await Storage.deletePasscode();
        await Storage.setAuthMethod('none');
        updateAuthMethod('none');
        loadSettings();
        toast({ type: 'success', title: i18n.t('updated'), message: i18n.t('passcodeDisabled') });
      })();
    }
  };

  const handleBiometricToggle = async (enabled) => {
    if (enabled) {
      if (Platform.OS === 'web') {
        toast({ type: 'warning', title: i18n.t('notAvailable'), message: i18n.t('biometricNotAvailableWeb') });
        return;
      }
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          toast({
            type: 'warning',
            title: i18n.t('notAvailable'),
            message: i18n.t('biometricNotAvailableDevice'),
          });
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: i18n.t('enableBiometricPrompt') });
        if (result.success) { 
          await Storage.setAuthMethod('biometric'); 
          updateAuthMethod('biometric');
          loadSettings(); 
          toast({ type: 'success', title: i18n.t('updated'), message: i18n.t('biometricEnabled') });
        }
      } catch { 
        toast({ type: 'error', title: i18n.t('error'), message: i18n.t('couldNotEnableBiometric') });
      }
    } else {
      const ok = await confirm({
        title: i18n.t('disableBiometricQuestion'),
        message: i18n.t('disableBiometricConfirm'),
        confirmText: i18n.t('disable'),
        cancelText: i18n.t('cancel'),
        destructive: true,
      });
      if (!ok) return;
      await Storage.setAuthMethod('none');
      updateAuthMethod('none');
      loadSettings();
      toast({ type: 'success', title: i18n.t('updated'), message: i18n.t('biometricDisabled') });
    }
  };

  const handleManualSync = async () => {
    if (!user || user.isGuest) {
      toast({ type: 'warning', title: i18n.t('guestMode'), message: i18n.t('signInToSyncMsg') });
      return;
    }

    setSyncing(true);
    const result = await firebaseSync.syncAllData();
    setSyncing(false);

    if (result.success) {
      toast({ type: 'success', title: i18n.t('syncComplete'), message: i18n.t('dataSynced') });
    } else if (result.pending) {
      toast({ type: 'info', title: i18n.t('noInternetConnection'), message: i18n.t('dataWillSyncWhenOnline') });
    } else {
      toast({ type: 'error', title: i18n.t('syncFailed'), message: result.error || i18n.t('couldNotSync') });
    }
  };

  const openExchangeRatesModal = async () => {
    const current = await Storage.getExchangeRates();
    const ratesObj = current.rates || {};
    const walletCodes = walletBalances.map(w => w.currencyCode);
    const base = current.baseCurrency && walletCodes.includes(current.baseCurrency)
      ? current.baseCurrency
      : (walletCodes[0] || current.baseCurrency || DEFAULT_CURRENCY);
    const rateStrings = {};
    walletCodes.filter(code => code !== base).forEach(code => {
      rateStrings[code] = ratesObj[code] != null ? String(ratesObj[code]) : '';
    });
    setExchangeRateForm({ baseCurrency: base, rates: rateStrings });
    setTimeout(() => setShowExchangeRatesModal(true), 0);
  };

  const handleSaveExchangeRates = async () => {
    setSavingRates(true);
    const base = exchangeRateForm.baseCurrency || DEFAULT_CURRENCY;
    const rates = {};
    Object.entries(exchangeRateForm.rates || {}).forEach(([code, val]) => {
      if (code === base) return;
      const num = parseFloat(String(val).replace(/,/g, ''));
      if (!Number.isNaN(num) && num > 0) rates[code] = num;
    });
    const ok = await Storage.saveExchangeRates({ baseCurrency: base, rates });
    setSavingRates(false);
    if (ok) {
      await loadExchangeRates();
      setShowExchangeRatesModal(false);
      toast({ type: 'success', title: i18n.t('success'), message: i18n.t('exchangeRatesSaved') });
    } else {
      toast({ type: 'error', title: i18n.t('error'), message: i18n.t('couldNotSaveExchangeRates') });
    }
  };

  const handleChooseConvertCurrency = () => {
    setShowRemoveCurrencyOptionsModal(false);
    setConvertTargetCurrency(walletToRemove ? (walletBalances.find(ow => ow.id !== walletToRemove.id)?.currencyCode || '') : '');
    setConvertRate('');
    setTimeout(() => setShowConvertCurrencyModal(true), 0);
  };

  const handleChooseDeleteTransactions = async () => {
    setShowRemoveCurrencyOptionsModal(false);
    const count = walletToRemove?.transactionCount ?? 0;
    const ok = await confirm({
      title: i18n.t('deleteAndRemoveCurrency'),
      message: i18n.t('deleteAndRemoveConfirm'),
      confirmText: i18n.t('deleteAndRemove'),
      cancelText: i18n.t('cancel'),
      destructive: true,
    });
    if (!ok || !walletToRemove) return;
    setConvertingOrDeleting(true);
    try {
      const result = await Storage.deleteTransactionsWithCurrencyAndRemoveWallet(walletToRemove.id);
      if (result.success) {
        await loadWallets();
        await refreshBalances();
        toast({ type: 'success', title: i18n.t('removed'), message: i18n.t('convertedAndRemoved') });
      } else {
        toast({ type: 'error', title: i18n.t('error'), message: result.error });
      }
    } catch (e) {
      toast({ type: 'error', title: i18n.t('error'), message: e.message || i18n.t('couldNotClearData') });
    } finally {
      setConvertingOrDeleting(false);
      setWalletToRemove(null);
    }
  };

  const handleConfirmConvertCurrency = async () => {
    if (!walletToRemove || !convertTargetCurrency.trim()) {
      toast({ type: 'warning', title: i18n.t('currency'), message: i18n.t('selectTargetCurrency') });
      return;
    }
    const rateNum = parseFloat(convertRate.replace(/,/g, ''));
    if (Number.isNaN(rateNum) || rateNum <= 0) {
      toast({ type: 'warning', title: i18n.t('invalidRate'), message: i18n.t('enterValidRate') });
      return;
    }
    setConvertingOrDeleting(true);
    try {
      const result = await Storage.convertTransactionsToCurrencyAndRemoveWallet(walletToRemove.id, convertTargetCurrency.trim(), rateNum);
      if (result.success) {
        await loadWallets();
        await refreshBalances();
        setShowConvertCurrencyModal(false);
        setWalletToRemove(null);
        setConvertTargetCurrency('');
        setConvertRate('');
        toast({ type: 'success', title: i18n.t('done'), message: i18n.t('convertedAndRemoved') });
      } else {
        toast({ type: 'error', title: i18n.t('error'), message: result.error });
      }
    } catch (e) {
      toast({ type: 'error', title: i18n.t('error'), message: e.message || i18n.t('couldNotClearData') });
    } finally {
      setConvertingOrDeleting(false);
    }
  };

  const handleDeleteAllTransactions = async () => {
    const ok = await confirm({
      title: i18n.t('deleteAllTransactionsConfirmTitle'),
      message: i18n.t('deleteAllTransactionsConfirmMessage'),
      confirmText: i18n.t('delete'),
      cancelText: i18n.t('cancel'),
      destructive: true,
    });
    if (!ok) return;
    setDeleteAllVerification('');
    setTimeout(() => setShowDeleteAllModal(true), 0);
  };

  const handleConfirmDeleteAllTransactions = async () => {
    if (deleteAllVerification.trim().toUpperCase() !== 'DELETE') return;
    setDeletingAll(true);
    try {
      const cleared = await Storage.clearAllTransactions();
      if (!cleared) {
        toast({ type: 'error', title: i18n.t('error'), message: i18n.t('couldNotClearData') });
        setDeletingAll(false);
        return;
      }
      if (user && !user.isGuest) {
        const result = await firebaseSync.syncAllData();
        if (!result.success && !result.pending) {
          toast({ type: 'warning', title: i18n.t('clearedLocally'), message: i18n.t('cloudSyncFailedMsg') });
        }
      }
      await refreshBalances();
      setShowDeleteAllModal(false);
      setDeleteAllVerification('');
      toast({ type: 'success', title: i18n.t('success'), message: i18n.t('deleteAllTransactionsDone') });
      navigation.navigate('Transaction');
    } catch (e) {
      console.error('Delete all transactions error:', e);
      toast({ type: 'error', title: i18n.t('error'), message: e.message || i18n.t('couldNotClearData') });
    } finally {
      setDeletingAll(false);
    }
  };

  const handleRefreshFromFirebase = async () => {
    if (!user || user.isGuest) {
      toast({ type: 'warning', title: i18n.t('guestMode'), message: i18n.t('signInToSyncMsg') });
      return;
    }

    // Confirm action
    const confirmAction = await confirm({
      title: i18n.t('refreshFromFirebase'),
      message: i18n.t('refreshFromFirebaseSubtitle'),
      confirmText: i18n.t('confirm'),
      cancelText: i18n.t('cancel'),
    });

    if (!confirmAction) return;

    setSyncing(true);
    const result = await firebaseSync.forceRefreshFromFirebase();
    setSyncing(false);

    if (result.success) {
      toast({
        type: 'success',
        title: i18n.t('syncComplete'),
        message: i18n.t('restoredCount').replace('{customers}', result.customersCount).replace('{transactions}', result.transactionsCount),
      });
      navigation.navigate('Transaction');
    } else {
      const errorMsg = result.error || i18n.t('couldNotSync');
      toast({ type: 'error', title: i18n.t('syncFailed'), message: errorMsg });
    }
  };

  const handlePasswordReset = async () => {
    if (!user || user.isGuest || !user.email) {
      toast({ type: 'error', title: i18n.t('notAvailable'), message: i18n.t('missingEmail') });
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
      toast({ type: 'success', title: i18n.t('emailSent'), message: i18n.t('checkYourEmail') });
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMsg = error.message || 'Failed to send password reset email.';
      toast({ type: 'error', title: i18n.t('error'), message: errorMsg });
    }
  };

  const handleLogout = async () => {
    console.log('handleLogout called');
    
    const confirmLogout = await confirm({
      title: i18n.t('logout') + '?',
      message: i18n.t('logout') + '?',
      confirmText: i18n.t('logout'),
      cancelText: i18n.t('cancel'),
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
        toast({ type: 'success', title: i18n.t('success'), message: i18n.t('logout') });
        console.log('Navigating to Login...');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        toast({ type: 'error', title: i18n.t('error'), message: result.error || i18n.t('somethingWentWrong') });
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({ type: 'error', title: i18n.t('error'), message: i18n.t('somethingWentWrong') });
    }
  };

  const themeOptions = [
    { code: 'light', name: i18n.t('lightMode'), icon: 'sunny' },
    { code: 'dark', name: i18n.t('darkMode'), icon: 'moon' },
    { code: 'device', name: i18n.t('devicePreference'), icon: 'phone-portrait' },
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
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <Text style={[styles.title, { color: colors.text }]}>{i18n.t('settings')}</Text>
        </Animated.View>

        <Animated.View style={{ opacity: sectionsAnim, transform: [{ translateY: sectionsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          {/* Account */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('account')}</Text>
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
                  title={i18n.t('changePasscode')}
                  subtitle={i18n.t('resetPassword')}
                  onPress={async () => {
                    const ok = await confirm({
                      title: i18n.t('resetPassword'),
                      message: `${i18n.t('resetPasswordSubtitle')}`,
                      confirmText: i18n.t('sendLink'),
                      cancelText: i18n.t('cancel'),
                    });
                    if (ok) handlePasswordReset();
                  }}
                  iconColor={colors.warning}
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
                <Item
                  icon="cloud-upload"
                  title={i18n.t('syncToFirebase')}
                  subtitle={i18n.t('syncToFirebaseSubtitle')}
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
                  title={i18n.t('refreshFromFirebase')}
                  subtitle={i18n.t('refreshFromFirebaseSubtitle')}
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
                  title={i18n.t('logout')}
                  subtitle={i18n.t('logout')}
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
                  title={i18n.t('guestMode')}
                  subtitle={i18n.t('guestAccountSubtitle')}
                />
                <Item
                  icon="log-in"
                  title={i18n.t('signIn')}
                  subtitle={i18n.t('signInToSync')}
                  onPress={async () => {
                    const ok = await confirm({
                      title: i18n.t('signIn'),
                      message: i18n.t('guestNote'),
                      confirmText: i18n.t('signIn'),
                      cancelText: i18n.t('cancel'),
                    });
                    if (ok) navigation.navigate('Login');
                  }}
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
                <Item
                  icon="person-add"
                  title={i18n.t('createAccount')}
                  subtitle={i18n.t('signUpSubtitle')}
                  onPress={() => navigation.navigate('Signup')}
                  last
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
              </>
            ) : (
              <>
                <Item
                  icon="log-in"
                  title={i18n.t('signIn')}
                  subtitle={i18n.t('signInSubtitle')}
                  onPress={() => navigation.navigate('Login')}
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
                <Item
                  icon="person-add"
                  title={i18n.t('createAccount')}
                  subtitle={i18n.t('signUpSubtitle')}
                  onPress={() => navigation.navigate('Signup')}
                  last
                  right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
                />
              </>
            )}
          </GlassCard>

          {/* Backup & restore - available to all */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('backup')} & {i18n.t('restore')}</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="save-outline"
              title={i18n.t('createBackup')}
              subtitle={i18n.t('createBackupSubtitle')}
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
              title={i18n.t('restoreBackup')}
              subtitle={i18n.t('restoreBackupSubtitle')}
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

          {/* Delete all transactions */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('dataManagement')}</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="trash-outline"
              title={i18n.t('deleteAllTransactions')}
              subtitle={i18n.t('deleteAllTransactionsSubtitle')}
              onPress={handleDeleteAllTransactions}
              iconColor={colors.error}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
          </GlassCard>

          {/* Sync Status (for logged in users) */}
          {user && !isGuest && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('dataManagement')}</Text>
              <GlassCard style={[styles.statusCard, { backgroundColor: colors.surface }]}>
                <View style={styles.statusRow}>
                  <Ionicons name="cloud-done" size={24} color={colors.success} />
                  <View style={styles.statusInfo}>
                    <Text style={[styles.statusTitle, { color: colors.text }]}>{i18n.t('syncToFirebase')}</Text>
                    <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
                      {i18n.t('syncToFirebaseSubtitle')}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </>
          )}

          {/* Security */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('security')}</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="lock-closed"
              title={i18n.t('passcode')}
              subtitle={authMethod === 'passcode' ? i18n.t('enablePasscode') : i18n.t('disable')}
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
              title={i18n.t('useFingerprint')}
              subtitle={authMethod === 'biometric' ? i18n.t('enablePasskey') : i18n.t('disable')}
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
                title={i18n.t('autoLock')}
                subtitle={lockTimeoutOptions.find(opt => opt.value === lockTimeout)?.label || 'Immediately'}
                onPress={() => setTimeout(() => setShowLockTimeoutModal(true), 0)}
                last
                right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
              />
            )}
            {!(authMethod === 'passcode' || authMethod === 'biometric') && (
              <View style={{ height: 0 }} />
            )}
          </GlassCard>

          {/* Appearance */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('appearance')}</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="contrast"
              title={i18n.t('theme')}
              subtitle={themeOptions.find(t => t.code === theme)?.name}
              onPress={() => setTimeout(() => setShowThemeModal(true), 0)}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
            <Item
              icon="language"
              title={i18n.t('language')}
              subtitle={LANGUAGES.find(l => l.code === language)?.name || 'English'}
              onPress={() => setTimeout(() => setShowLanguageModal(true), 0)}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
              last
            />
          </GlassCard>

          {/* Currencies & Balances */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('currenciesAndBalances')}</Text>
          <GlassCard style={styles.section}>
            {walletBalances.length === 0 ? (
              <TouchableOpacity
                style={[styles.walletAddRow, { borderColor: colors.border }]}
                onPress={() => {
                  setWalletForm({ currencyCode: '', initialBalance: '' });
                  setShowAddWalletModal(true);
                }}
                activeOpacity={0.8}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
                <Text style={[styles.walletAddText, { color: colors.accent }]}>{i18n.t('addFirstCurrency')}</Text>
              </TouchableOpacity>
            ) : (
              <>
                {walletBalances.map((w, idx) => {
                  const info = CURRENCIES.find(c => c.code === w.currencyCode);
                  const isLast = idx === walletBalances.length - 1;
                  return (
                    <View key={w.id} style={[styles.walletRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                      <View style={styles.walletRowLeft}>
                        <Text style={[styles.walletSymbol, { color: colors.text }]}>{info?.symbol || w.currencyCode}</Text>
                        <View>
                          <Text style={[styles.walletName, { color: colors.text }]}>{info?.name || w.currencyCode}</Text>
                          <Text style={[styles.walletBalance, { color: colors.textSecondary }]}>{format(w.balance ?? 0, w.currencyCode)}</Text>
                        </View>
                      </View>
                      <View style={styles.walletRowActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingWallet(w);
                            setWalletForm({ currencyCode: '', initialBalance: '' });
                            setTimeout(() => setShowEditWalletModal(true), 0);
                          }}
                          style={[styles.walletActionBtn, { backgroundColor: colors.backgroundSecondary }]}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          <Ionicons name="swap-horizontal" size={18} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={async () => {
                            const ok = await confirm({
                              title: i18n.t('removeWallet'),
                              message: i18n.t('confirmRemoveCurrency'),
                              confirmText: i18n.t('remove'),
                              cancelText: i18n.t('cancel'),
                              destructive: true,
                            });
                            if (!ok) return;
                            setRemovingWalletId(w.id);
                            const result = await removeWallet(w.id);
                            setRemovingWalletId(null);
                            if (result.success) {
                              toast({ type: 'success', title: i18n.t('removed'), message: `${w.currencyCode} ${i18n.t('removed').toLowerCase()}` });
                            } else if (result.transactionCount > 0) {
                              setWalletToRemove({ ...w, transactionCount: result.transactionCount });
                              setTimeout(() => setShowRemoveCurrencyOptionsModal(true), 0);
                            } else {
                              toast({ type: 'error', title: i18n.t('error'), message: result.error });
                            }
                          }}
                          disabled={removingWalletId !== null}
                          style={[styles.walletActionBtn, { backgroundColor: colors.error + '20', opacity: removingWalletId === w.id ? 0.6 : 1 }]}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                          {removingWalletId === w.id ? (
                            <ActivityIndicator size="small" color={colors.error} />
                          ) : (
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                {walletBalances.length < 3 && (
                  <TouchableOpacity
                    style={[styles.walletAddRow, { borderColor: colors.border, marginTop: 8 }]}
                    onPress={() => {
                      setWalletForm({ currencyCode: '', initialBalance: '' });
                      setShowAddWalletModal(true);
                    }}
                    activeOpacity={0.8}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="add" size={22} color={colors.accent} />
                    <Text style={[styles.walletAddText, { color: colors.accent }]}>{i18n.t('addCurrency')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </GlassCard>

          {/* Exchange rates */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('exchangeRates')}</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="swap-horizontal"
              title={i18n.t('exchangeRates')}
              subtitle={i18n.t('exchangeRatesSubtitle')}
              onPress={openExchangeRatesModal}
              iconColor={colors.warning}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
          </GlassCard>

          {/* Help & Support */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('contactSupport')}</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="logo-whatsapp"
              title={i18n.t('contactSupport')}
              subtitle="+93 790 285 355"
              iconColor={colors.success}
              onPress={() => {
                const url = 'https://wa.me/93790285355';
                Linking.openURL(url).catch(() => toast({ type: 'error', title: i18n.t('error'), message: i18n.t('somethingWentWrong') }));
              }}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
            <Item
              icon="mail"
              title={i18n.t('contact')}
              subtitle="rohanidgtl@gmail.com"
              iconColor={colors.warning}
              onPress={() => {
                const url = 'mailto:rohanidgtl@gmail.com?subject=Hesabay Money Support';
                Linking.openURL(url).catch(() => toast({ type: 'error', title: i18n.t('error'), message: i18n.t('somethingWentWrong') }));
              }}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
            <Item
              icon="shield-checkmark"
              title={i18n.t('privacyPolicy')}
              subtitle={i18n.t('privacyPolicy')}
              iconColor={colors.info}
              onPress={() => {
                const url = getPrivacyPolicyUrl();
                Linking.openURL(url).catch(() => toast({ type: 'error', title: i18n.t('error'), message: i18n.t('somethingWentWrong') }));
              }}
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
            <Item
              icon="star"
              title={i18n.t('rateApp')}
              subtitle={i18n.t('shareApp')}
              iconColor={colors.warning}
              onPress={async () => {
                const ok = await confirm({
                  title: i18n.t('rateApp'),
                  message: i18n.t('rateApp'),
                  confirmText: i18n.t('rate'),
                  cancelText: i18n.t('cancel'),
                });
                if (!ok) return;
                const url = getRateAppUrl();
                Linking.openURL(url).catch(() => toast({ type: 'error', title: i18n.t('error'), message: i18n.t('somethingWentWrong') }));
              }}
              last
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
          </GlassCard>

          {/* About */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{i18n.t('about')}</Text>
          <GlassCard style={styles.section}>
            <Item
              icon="information-circle"
              title={i18n.t('about')}
              subtitle={i18n.t('appVersion')}
              onPress={() => navigation.navigate('About')}
              last
              right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            />
          </GlassCard>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              Powered by{' '}
              <Text style={[styles.footerBrand, { color: colors.accent }]}>Rohani Digital</Text>
            </Text>
            <Text style={[styles.footerCopyright, { color: colors.textTertiary }]}>
              © {new Date().getFullYear()} {i18n.t('allRightsReserved')}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Theme Modal */}
      <Modal visible={showThemeModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setShowThemeModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('selectTheme')}</Text>
            {themeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.code}
                style={[styles.themeOpt, { backgroundColor: theme === opt.code ? colors.accentLight : colors.backgroundSecondary }]}
                onPress={() => { 
                  changeTheme(opt.code); 
                  setShowThemeModal(false); 
                  toast({ type: 'success', title: i18n.t('success'), message: `${i18n.t('theme')}: ${opt.name}` });
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

      {/* Language Modal */}
      <Modal visible={showLanguageModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setShowLanguageModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('selectLanguage')}</Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.themeOpt, { backgroundColor: language === lang.code ? colors.accentLight : colors.backgroundSecondary }]}
                onPress={async () => {
                  await changeLanguage(lang.code);
                  setShowLanguageModal(false);
                  toast({ type: 'success', title: i18n.t('success'), message: `${i18n.t('language')}: ${lang.name}` });
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: language === lang.code }}
              >
                <Ionicons name="language" size={20} color={language === lang.code ? colors.accent : colors.textSecondary} />
                <Text style={[styles.themeOptText, { color: colors.text }]}>{lang.name}</Text>
                {language === lang.code && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Add Wallet Modal */}
      <Modal visible={showAddWalletModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowAddWalletModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={[styles.modalBackdrop, { zIndex: 0 }]} onPress={() => { Keyboard.dismiss(); setShowAddWalletModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, styles.modalContentScrollable, { backgroundColor: colors.background, zIndex: 1 }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('addCurrency')}</Text>
            <Text style={[styles.walletModalLabel, { color: colors.textSecondary }]}>{i18n.t('currency')}</Text>
            <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {CURRENCIES.filter(c => !wallets.some(w => w.currencyCode === c.code)).length === 0 ? (
                <Text style={[styles.walletModalHint, { color: colors.textTertiary, marginVertical: 12 }]}>{i18n.t('maxCurrenciesReached')}</Text>
              ) : (
                CURRENCIES.filter(c => !wallets.some(w => w.currencyCode === c.code)).map((curr) => (
                  <TouchableOpacity
                    key={curr.code}
                    style={[styles.themeOpt, { backgroundColor: walletForm.currencyCode === curr.code ? colors.accentLight : colors.backgroundSecondary }]}
                    onPress={() => setWalletForm(f => ({ ...f, currencyCode: curr.code }))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.currencySymbol, { color: walletForm.currencyCode === curr.code ? colors.accent : colors.textSecondary }]}>{curr.symbol}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.themeOptText, { color: colors.text }]}>{curr.name}</Text>
                      <Text style={[styles.currencyCode, { color: colors.textSecondary }]}>{curr.code}</Text>
                    </View>
                    {walletForm.currencyCode === curr.code && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <Pressable
              style={[styles.walletSubmitBtn, { backgroundColor: colors.accent, opacity: (walletForm.currencyCode && !addWalletSubmitting) ? 1 : 0.5 }]}
              disabled={!walletForm.currencyCode || addWalletSubmitting}
              onPress={async () => {
                if (!walletForm.currencyCode) {
                  toast({ type: 'warning', title: i18n.t('currency'), message: i18n.t('selectCurrency') });
                  return;
                }
                setAddWalletSubmitting(true);
                try {
                  const result = await addWallet({
                    currencyCode: walletForm.currencyCode,
                    initialBalance: 0,
                  });
                  if (result && result.success) {
                    setShowAddWalletModal(false);
                    setWalletForm({ currencyCode: '', initialBalance: '' });
                    toast({ type: 'success', title: i18n.t('added'), message: `${result.wallet?.currencyCode || walletForm.currencyCode} ${i18n.t('added').toLowerCase()}` });
                  } else {
                    toast({ type: 'error', title: i18n.t('error'), message: (result && result.error) || i18n.t('somethingWentWrong') });
                  }
                } catch (e) {
                  console.error('addWallet:', e);
                  toast({ type: 'error', title: i18n.t('error'), message: e?.message || i18n.t('somethingWentWrong') });
                } finally {
                  setAddWalletSubmitting(false);
                }
              }}
            >
              <Text style={[styles.walletSubmitText, { color: colors.onAccent }]}>{addWalletSubmitting ? '...' : i18n.t('addCurrency')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change currency Modal */}
      <Modal visible={showEditWalletModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowEditWalletModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setShowEditWalletModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, styles.modalContentScrollable, { backgroundColor: colors.background }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('changeCurrency')}</Text>
              {editingWallet && (
                <>
                  <Text style={[styles.walletModalHint, { color: colors.textSecondary, marginBottom: 12 }]}>
                    {CURRENCIES.find(c => c.code === editingWallet.currencyCode)?.name || editingWallet.currencyCode} ({editingWallet.currencyCode})
                  </Text>
                  <Text style={[styles.walletModalLabel, { color: colors.textSecondary }]}>{i18n.t('changeCurrency')}</Text>
                  <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {CURRENCIES.filter(c => c.code !== editingWallet.currencyCode && !wallets.some(w => w.id !== editingWallet.id && w.currencyCode === c.code)).map((curr) => (
                      <TouchableOpacity
                        key={curr.code}
                        style={[styles.themeOpt, { backgroundColor: walletForm.currencyCode === curr.code ? colors.accentLight : colors.backgroundSecondary }]}
                        onPress={() => setWalletForm(f => ({ ...f, currencyCode: curr.code }))}
                      >
                        <Text style={[styles.currencySymbol, { color: walletForm.currencyCode === curr.code ? colors.accent : colors.textSecondary }]}>{curr.symbol}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.themeOptText, { color: colors.text }]}>{curr.name}</Text>
                          <Text style={[styles.currencyCode, { color: colors.textSecondary }]}>{curr.code}</Text>
                        </View>
                        {walletForm.currencyCode === curr.code && <Ionicons name="checkmark" size={20} color={colors.accent} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                    <TouchableOpacity
                      style={[styles.walletSubmitBtn, { flex: 1, backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => { setShowEditWalletModal(false); setEditingWallet(null); }}
                    >
                      <Text style={[styles.walletSubmitText, { color: colors.text }]}>{i18n.t('cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.walletSubmitBtn, { flex: 1, backgroundColor: colors.accent, opacity: walletForm.currencyCode ? 1 : 0.5 }]}
                      disabled={!walletForm.currencyCode}
                      onPress={async () => {
                        if (!walletForm.currencyCode) return;
                        const result = await updateWallet(editingWallet.id, { currencyCode: walletForm.currencyCode });
                        if (result.success) {
                          setShowEditWalletModal(false);
                          setEditingWallet(null);
                          setWalletForm({ currencyCode: '', initialBalance: '' });
                          toast({ type: 'success', title: i18n.t('success'), message: `Currency changed to ${walletForm.currencyCode}.` });
                        } else {
                          toast({ type: 'error', title: i18n.t('error'), message: result.error });
                        }
                      }}
                    >
                      <Text style={[styles.walletSubmitText, { color: colors.onAccent }]}>{i18n.t('changeCurrency')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete all transactions verification modal */}
      <Modal visible={showDeleteAllModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => !deletingAll && setShowDeleteAllModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); if (!deletingAll) setShowDeleteAllModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, styles.modalContentScrollable, { backgroundColor: colors.background }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('deleteAllTransactionsConfirmTitle')}</Text>
              <Text style={[styles.walletModalHint, { color: colors.textSecondary, marginBottom: 12 }]}>{i18n.t('deleteAllTransactionsTypeToConfirm')}</Text>
              <TextInput
                style={[styles.walletInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                placeholder="DELETE"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                value={deleteAllVerification}
                onChangeText={setDeleteAllVerification}
                editable={!deletingAll}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  style={[styles.walletSubmitBtn, { flex: 1, backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => { setShowDeleteAllModal(false); setDeleteAllVerification(''); }}
                  disabled={deletingAll}
                >
                  <Text style={[styles.walletSubmitText, { color: colors.text }]}>{i18n.t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.walletSubmitBtn, { flex: 1, backgroundColor: colors.error, opacity: deleteAllVerification.trim().toUpperCase() === 'DELETE' ? 1 : 0.5 }]}
                  onPress={handleConfirmDeleteAllTransactions}
                  disabled={deletingAll || deleteAllVerification.trim().toUpperCase() !== 'DELETE'}
                >
                  {deletingAll ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.walletSubmitText, { color: '#fff' }]}>{i18n.t('delete')}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <KeyboardSpacer />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exchange rates modal */}
      <Modal visible={showExchangeRatesModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowExchangeRatesModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setShowExchangeRatesModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, styles.modalContentScrollable, { backgroundColor: colors.background, maxHeight: '90%' }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              style={{ maxHeight: '100%' }}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('exchangeRates')}</Text>
              <Text style={[styles.walletModalHint, { color: colors.textSecondary, marginBottom: 12 }]}>
                {i18n.t('exchangeRatesHint')}
              </Text>
              {walletBalances.length === 0 ? (
                <Text style={[styles.walletModalHint, { color: colors.textTertiary, marginVertical: 16 }]}>{i18n.t('addCurrencyInSettingsFirst')}</Text>
              ) : (
                <>
                  <Text style={[styles.walletModalLabel, { color: colors.textSecondary }]}>{i18n.t('baseCurrency')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                    {walletBalances.map((w) => (
                      <TouchableOpacity
                        key={w.id}
                        onPress={() => setExchangeRateForm(f => ({ ...f, baseCurrency: w.currencyCode }))}
                        style={[
                          styles.themeOpt,
                          { marginRight: 8, marginBottom: 0, minWidth: 80 },
                          exchangeRateForm.baseCurrency === w.currencyCode ? { backgroundColor: colors.accentLight } : { backgroundColor: colors.backgroundSecondary },
                        ]}
                      >
                        <Text style={[styles.currencyCode, { color: exchangeRateForm.baseCurrency === w.currencyCode ? colors.accent : colors.textSecondary }]}>{w.currencyCode}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={[styles.walletModalLabel, { color: colors.textSecondary }]}>{i18n.t('ratePerBase')}</Text>
                  {walletBalances.filter(w => w.currencyCode !== exchangeRateForm.baseCurrency).map((w) => (
                    <View key={w.id} style={[styles.walletRow, { borderBottomWidth: 0, paddingVertical: 8 }]}>
                      <Text style={[styles.walletBalance, { color: colors.text, flex: 0, width: 80 }]}>
                        1 {exchangeRateForm.baseCurrency} =
                      </Text>
                      <TextInput
                        style={[styles.walletInput, { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                        value={exchangeRateForm.rates[w.currencyCode] ?? ''}
                        onChangeText={(t) => setExchangeRateForm(f => ({
                          ...f,
                          rates: { ...(f.rates || {}), [w.currencyCode]: t.replace(/[^0-9.]/g, '') },
                        }))}
                      />
                      <Text style={[styles.walletName, { color: colors.textSecondary, marginLeft: 8, flex: 0 }]}>{w.currencyCode}</Text>
                    </View>
                  ))}
                </>
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.walletSubmitBtn, { flex: 1, backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => setShowExchangeRatesModal(false)}
                  disabled={savingRates}
                >
                  <Text style={[styles.walletSubmitText, { color: colors.text }]}>{i18n.t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.walletSubmitBtn, { flex: 1, backgroundColor: colors.accent }]}
                  onPress={handleSaveExchangeRates}
                  disabled={savingRates}
                >
                  {savingRates ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Text style={[styles.walletSubmitText, { color: colors.onAccent }]}>{i18n.t('save')}</Text>}
                </TouchableOpacity>
              </View>
              <KeyboardSpacer />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Remove currency: options when currency has transactions */}
      <Modal visible={showRemoveCurrencyOptionsModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => !convertingOrDeleting && setShowRemoveCurrencyOptionsModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); if (!convertingOrDeleting) setShowRemoveCurrencyOptionsModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]} pointerEvents="auto">
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {walletToRemove?.currencyCode} ({walletToRemove?.transactionCount ?? 0})
          </Text>
          <Text style={[styles.walletModalHint, { color: colors.textSecondary, marginBottom: 20 }]}>
            {i18n.t('selectTargetCurrency')}
          </Text>
          <TouchableOpacity
            style={[styles.walletSubmitBtn, { backgroundColor: colors.accentLight, marginBottom: 12 }]}
            onPress={handleChooseConvertCurrency}
            disabled={convertingOrDeleting || (walletBalances.filter(w => w.id !== walletToRemove?.id).length === 0)}
          >
            <Text style={[styles.walletSubmitText, { color: colors.accent }]}>{i18n.t('changeCurrency')}</Text>
          </TouchableOpacity>
          <Text style={[styles.walletModalHint, { color: colors.textTertiary, marginBottom: 12, fontSize: 13 }]}>
            {i18n.t('convertedAndRemoved')}
          </Text>
          <TouchableOpacity
            style={[styles.walletSubmitBtn, { backgroundColor: colors.error + '25', marginBottom: 12 }]}
            onPress={handleChooseDeleteTransactions}
            disabled={convertingOrDeleting}
          >
            <Text style={[styles.walletSubmitText, { color: colors.error }]}>{i18n.t('deleteAndRemove')}</Text>
          </TouchableOpacity>
          <Text style={[styles.walletModalHint, { color: colors.textTertiary, fontSize: 13 }]}>
            {i18n.t('deleteAndRemoveConfirm')}
          </Text>
          <TouchableOpacity
            style={[styles.walletSubmitBtn, { marginTop: 20, backgroundColor: colors.backgroundSecondary }]}
            onPress={() => { setShowRemoveCurrencyOptionsModal(false); setWalletToRemove(null); }}
            disabled={convertingOrDeleting}
          >
            <Text style={[styles.walletSubmitText, { color: colors.text }]}>{i18n.t('cancel')}</Text>
          </TouchableOpacity>
        </View>
        </View>
      </Modal>

      {/* Convert currency: pick target and rate */}
      <Modal visible={showConvertCurrencyModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => !convertingOrDeleting && setShowConvertCurrencyModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); if (!convertingOrDeleting) setShowConvertCurrencyModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, styles.modalContentScrollable, { backgroundColor: colors.background }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('changeCurrency')}</Text>
              <Text style={[styles.walletModalHint, { color: colors.textSecondary, marginBottom: 12 }]}>
                {walletToRemove?.currencyCode} ({walletToRemove?.transactionCount ?? 0})
              </Text>
              <Text style={[styles.walletModalLabel, { color: colors.textSecondary }]}>{i18n.t('selectTargetCurrency')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {walletBalances.filter(w => w.id !== walletToRemove?.id).map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => setConvertTargetCurrency(w.currencyCode)}
                    style={[
                      styles.themeOpt,
                      { marginRight: 0, minWidth: 72 },
                      convertTargetCurrency === w.currencyCode ? { backgroundColor: colors.accentLight } : { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    <Text style={[styles.currencyCode, { color: convertTargetCurrency === w.currencyCode ? colors.accent : colors.textSecondary }]}>{w.currencyCode}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {convertTargetCurrency ? (
                <>
                  <Text style={[styles.walletModalLabel, { color: colors.textSecondary }]}>
                    {i18n.t('rate')}: 1 {walletToRemove?.currencyCode} = ? {convertTargetCurrency}
                  </Text>
                  <TextInput
                    style={[styles.walletInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary, marginBottom: 20 }]}
                    placeholder="e.g. 0.014"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={convertRate}
                    onChangeText={(t) => setConvertRate(t.replace(/[^0-9.]/g, ''))}
                    editable={!convertingOrDeleting}
                  />
                </>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.walletSubmitBtn, { flex: 1, backgroundColor: colors.backgroundSecondary }]}
                  onPress={() => { setShowConvertCurrencyModal(false); setWalletToRemove(null); setConvertTargetCurrency(''); setConvertRate(''); }}
                  disabled={convertingOrDeleting}
                >
                  <Text style={[styles.walletSubmitText, { color: colors.text }]}>{i18n.t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.walletSubmitBtn, { flex: 1, backgroundColor: colors.accent, opacity: convertTargetCurrency && convertRate ? 1 : 0.5 }]}
                  onPress={handleConfirmConvertCurrency}
                  disabled={convertingOrDeleting || !convertTargetCurrency || !convertRate}
                >
                  {convertingOrDeleting ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Text style={[styles.walletSubmitText, { color: colors.onAccent }]}>{i18n.t('confirm')}</Text>}
                </TouchableOpacity>
              </View>
              <KeyboardSpacer />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lock Timeout Modal */}
      <Modal visible={showLockTimeoutModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowLockTimeoutModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setShowLockTimeoutModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('autoLock')}</Text>
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {lockTimeoutOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.themeOpt, { backgroundColor: lockTimeout === option.value ? colors.accentLight : colors.backgroundSecondary }]}
                  onPress={async () => { 
                    await updateLockTimeout(option.value); 
                    setShowLockTimeoutModal(false); 
                    toast({ type: 'success', title: i18n.t('updated'), message: option.label });
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

      {!showThemeModal && !showLanguageModal && !showAddWalletModal && !showEditWalletModal && !showLockTimeoutModal && !showDeleteAllModal && !showExchangeRatesModal && !showRemoveCurrencyOptionsModal && !showConvertCurrencyModal && (
        <BottomNavigation navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  section: { marginBottom: 20, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 2 },
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
  footer: { marginTop: 28, marginBottom: 16, alignItems: 'center', gap: 6 },
  footerText: { fontSize: 13, textAlign: 'center' },
  footerBrand: { fontWeight: '700' },
  footerCopyright: { fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, minHeight: 0 },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalContentScrollable: { maxHeight: '85%' },
  modalHandle: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  themeOpt: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  themeOptText: { flex: 1, fontSize: 16, fontWeight: '500' },
  currencySymbol: { fontSize: 24, fontWeight: '600', width: 40, textAlign: 'center' },
  currencyCode: { fontSize: 12, marginTop: 2 },
  walletRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  walletRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  walletSymbol: { fontSize: 22, fontWeight: '600', width: 36, textAlign: 'center' },
  walletName: { fontSize: 16, fontWeight: '600' },
  walletBalance: { fontSize: 13, marginTop: 2 },
  walletRowActions: { flexDirection: 'row', gap: 8 },
  walletActionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  walletAddRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12 },
  walletAddText: { fontSize: 15, fontWeight: '600' },
  walletModalLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  walletModalHint: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  walletInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 18 },
  walletSubmitBtn: { marginTop: 16, padding: 14, borderRadius: 14, alignItems: 'center' },
  walletSubmitText: { fontSize: 16, fontWeight: '700' },
});
