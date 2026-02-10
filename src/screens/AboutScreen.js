import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import BottomNavigation from '../components/BottomNavigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_HEIGHT } from '../constants/layout';
import { getPrivacyPolicyUrl } from '../config/appLinks';
import i18n from '../utils/i18n';
import Constants from 'expo-constants';

export default function AboutScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const gradientColors = [colors.gradientStart || colors.background, colors.gradientEnd || colors.backgroundSecondary];
  const appVersion = Constants.expoConfig?.version || '2.0.0';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top, 12) + 20, paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{i18n.t('about')}</Text>
          </View>

          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: colors.accent }]}>
              <Text style={[styles.logoText, { color: colors.background }]}>H</Text>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>{i18n.t('appName')}</Text>
            <Text style={[styles.version, { color: colors.textSecondary }]}>{i18n.t('version')} {appVersion}</Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="information-circle" size={24} color={colors.accent} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>{i18n.t('aboutApp')}</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {i18n.t('aboutDescription')}
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="star" size={24} color={colors.warning} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>{i18n.t('features')}</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {'• '}{i18n.t('featureOfflineFirst')}{'\n'}
                {'• '}{i18n.t('featureMultiCurrency')}{'\n'}
                {'• '}{i18n.t('featureCloudSync')}{'\n'}
                {'• '}{i18n.t('featureSecure')}{'\n'}
                {'• '}{i18n.t('featureBackup')}
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="code" size={24} color={colors.info} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>{i18n.t('developedBy')}</Text>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {i18n.t('developerName')} — React Native & Expo
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Linking.openURL(getPrivacyPolicyUrl()).catch(() => {})}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel={i18n.t('privacyPolicy')}
            >
              <Ionicons name="shield-checkmark" size={24} color={colors.accent} />
              <View style={styles.linkCardRow}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>{i18n.t('privacyPolicy')}</Text>
                <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
              </View>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {i18n.t('privacy')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>© {new Date().getFullYear()} {i18n.t('appName')}</Text>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{i18n.t('allRightsReserved')}</Text>
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
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  version: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    marginBottom: 24,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  linkCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 4,
  },
});
