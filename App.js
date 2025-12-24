import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { AuthProvider } from './src/context/AuthContext';

// Screens
import AuthCheckScreen from './src/screens/AuthCheckScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import PhoneLoginScreen from './src/screens/PhoneLoginScreen';
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

function AppContent() {
  const { colors } = useContext(ThemeContext);

  return (
    <NavigationContainer
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
        initialRouteName="Login"
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
        <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
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

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
