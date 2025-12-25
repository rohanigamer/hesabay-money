import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppLockProvider, useAppLock } from './src/context/AppLockContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import CustomerDetailScreen from './src/screens/CustomerDetailScreen';
import CalculationScreen from './src/screens/CalculationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PasscodeScreen from './src/screens/PasscodeScreen';
import BiometricScreen from './src/screens/BiometricScreen';

const Stack = createStackNavigator();

// No animation - instant switch for crisp rendering
const forNoAnimation = () => ({
  cardStyle: {
    opacity: 1,
  },
});

function AppNavigator() {
  const { colors } = useContext(ThemeContext);
  const { loading, user } = useAuth();
  const { isLocked, authMethod, unlock } = useAppLock();
  const navigationRef = useRef(null);
  const isFirstRender = useRef(true);

  // Navigate when user state changes (after initial load)
  useEffect(() => {
    if (loading) return; // Don't navigate while loading
    
    // Skip first render - let initialRouteName handle it
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Navigate based on user state
    if (navigationRef.current) {
      if (user) {
        console.log('User logged in, navigating to Transaction');
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Transaction' }],
          })
        );
      } else {
        console.log('User logged out, navigating to Login');
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.logoBox, { backgroundColor: colors.accent }]}>
          <Text style={styles.logoText}>H</Text>
        </View>
        <Text style={[styles.appTitle, { color: colors.text }]}>Hesabay Money</Text>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  // Show authentication screen if app is locked
  if (isLocked && user) {
    if (authMethod === 'biometric') {
      return <BiometricScreen onSuccess={unlock} />;
    } else if (authMethod === 'passcode') {
      return <PasscodeScreen onSuccess={unlock} />;
    }
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: colors.background === '#000000',
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
      <StatusBar style={colors.background === '#ffffff' ? 'dark' : 'light'} />
      <Stack.Navigator
        initialRouteName={user ? "Transaction" : "Login"}
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: forNoAnimation,
          transitionSpec: {
            open: {
              animation: 'timing',
              config: { duration: 0 },
            },
            close: {
              animation: 'timing',
              config: { duration: 0 },
            },
          },
          cardStyle: { backgroundColor: colors.backgroundSecondary },
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
  return (
    <AppLockProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </AppLockProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <AppContent />
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
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
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
});
