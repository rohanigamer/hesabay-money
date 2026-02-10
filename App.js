import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Easing, Modal, Animated } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppLockProvider, useAppLock } from './src/context/AppLockContext';
import { FeedbackOverlay, FeedbackProvider } from './src/context/FeedbackContext';
import { SyncStatusProvider } from './src/context/SyncStatusContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import i18n from './src/utils/i18n';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import CustomerDetailScreen from './src/screens/CustomerDetailScreen';
import CalculationScreen from './src/screens/CalculationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AboutScreen from './src/screens/AboutScreen';
import PasscodeScreen from './src/screens/PasscodeScreen';
import BiometricScreen from './src/screens/BiometricScreen';
import OnboardingScreen, { isOnboardingComplete } from './src/screens/OnboardingScreen';

const Stack = createStackNavigator();

// Smooth cross-fade when switching between main tabs
const easeOutCubic = Easing.bezier(0.33, 1, 0.68, 1);
const smoothFadeInterpolator = ({ current }) => ({
  cardStyle: {
    opacity: current.progress.interpolate({
      inputRange: [0, 0.2, 0.5, 0.85, 1],
      outputRange: [0, 0.12, 0.45, 0.82, 1],
      extrapolate: 'clamp',
    }),
  },
});

const smoothFadeTransition = {
  open: {
    animation: 'timing',
    config: { duration: 360, easing: easeOutCubic },
  },
  close: {
    animation: 'timing',
    config: { duration: 280, easing: Easing.bezier(0.32, 0, 0.67, 0) },
  },
};

/**
 * Lock screen overlay — renders as a Modal so it sits ABOVE all other Modals
 * (exchange rates, add wallet, etc.). This is the key fix: regular Views cannot
 * cover React Native Modals, only another Modal can.
 */
function LockScreenModal() {
  const { isLocked, authMethod, unlock } = useAppLock();
  const { user } = useAuth();
  const { colors } = useContext(ThemeContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const shouldShow = isLocked && !!user && authMethod !== 'none';

  useEffect(() => {
    if (shouldShow) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <Modal
      visible={true}
      animationType="none"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <Animated.View style={[{ flex: 1, backgroundColor: colors.background }, { opacity: fadeAnim }]}>
        {authMethod === 'biometric' ? (
          <BiometricScreen onSuccess={unlock} />
        ) : authMethod === 'passcode' ? (
          <PasscodeScreen onSuccess={unlock} />
        ) : null}
      </Animated.View>
    </Modal>
  );
}

function AppNavigator() {
  const { colors, isDark } = useContext(ThemeContext);
  const { loading, user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigationRef = useRef(null);
  const prevUserUid = useRef(undefined);

  // Navigate ONLY when user actually changes (login → logout or vice versa)
  useEffect(() => {
    if (loading) return;

    const currentUid = user?.uid || null;
    const previousUid = prevUserUid.current;

    // First time: just record the uid, let initialRouteName handle it
    if (previousUid === undefined) {
      prevUserUid.current = currentUid;
      return;
    }

    // Same user — don't reset navigation
    if (currentUid === previousUid) return;

    // Actual user change — update ref and reset navigation
    prevUserUid.current = currentUid;

    if (navigationRef.current) {
      if (user) {
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Transaction' }],
          })
        );
      } else {
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
    }
  }, [user, loading]);

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={[styles.logoBox, { backgroundColor: colors.accent }]}>
          <Text style={[styles.logoText, { color: colors.onAccent }]}>H</Text>
        </View>
        <Text style={[styles.appTitle, { color: colors.text }]}>{i18n.t('appName')}</Text>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{i18n.t('loading')}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: isDark,
        colors: {
          background: colors.backgroundSecondary,
          primary: colors.accent,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName={user ? 'Transaction' : 'Login'}
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: smoothFadeInterpolator,
          transitionSpec: smoothFadeTransition,
          cardStyle: { backgroundColor: colors.backgroundSecondary },
          detachInactiveScreens: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Transaction" component={TransactionScreen} />
        <Stack.Screen name="Customers" component={CustomersScreen} />
        <Stack.Screen
          name="CustomerDetail"
          component={CustomerDetailScreen}
          options={{
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="Calculation" component={CalculationScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen
          name="PasscodeSetup"
          component={PasscodeScreen}
          options={{
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="Biometric" component={BiometricScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const done = await isOnboardingComplete();
    setShowOnboarding(!done);
  };

  if (showOnboarding === null) {
    return null;
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
    );
  }

  return (
    <AppLockProvider>
      <AuthProvider>
        <FeedbackProvider>
          <SyncStatusProvider>
            <AppNavigator />
            <FeedbackOverlay />
            {/* 
              LockScreenModal renders LAST and uses <Modal> component.
              This ensures it appears ABOVE all other modals (exchange rates,
              add wallet, export, etc.) because React Native stacks Modals
              in render order — last Modal wins.
            */}
            <LockScreenModal />
          </SyncStatusProvider>
        </FeedbackProvider>
      </AuthProvider>
    </AppLockProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <LanguageProvider>
            <CurrencyProvider>
              <AppContent />
            </CurrencyProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
});
