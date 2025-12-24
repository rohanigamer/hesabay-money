import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import BottomNavigation from '../components/BottomNavigation';

export default function AboutScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const gradientColors = colors.background === '#ffffff' 
    ? [colors.gradientStart, colors.gradientEnd]
    : [colors.gradientStart, colors.gradientEnd];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>About</Text>
          </View>

          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: colors.accent }]}>
              <Text style={[styles.logoText, { color: colors.background }]}>H</Text>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Hesabay Money</Text>
            <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="information-circle" size={24} color={colors.accent} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>About the App</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Hesabay Money is a comprehensive financial management application
                designed to help you manage your customers, transactions, and
                calculations efficiently.
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="star" size={24} color={colors.warning} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>Features</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                • Customer Management{'\n'}
                • Transaction Tracking{'\n'}
                • Financial Calculations{'\n'}
                • Secure Login System
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="code" size={24} color={colors.info} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>Developed with</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                React Native & Expo
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>© 2025 Hesabay Money</Text>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>All rights reserved</Text>
          </View>
        </ScrollView>
      </LinearGradient>
      <BottomNavigation navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 50,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  version: {
    fontSize: 14,
  },
  infoContainer: {
    marginBottom: 30,
  },
  infoCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 5,
  },
});
