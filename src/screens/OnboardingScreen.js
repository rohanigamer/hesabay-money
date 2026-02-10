import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES } from '../utils/i18n';
import i18n from '../utils/i18n';

const ONBOARDING_COMPLETE_KEY = '@onboarding_complete';

export async function isOnboardingComplete() {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingComplete() {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
  } catch {}
}

const themeOptions = [
  { code: 'light', icon: 'sunny', nameKey: 'lightMode' },
  { code: 'dark', icon: 'moon', nameKey: 'darkMode' },
  { code: 'device', icon: 'phone-portrait', nameKey: 'devicePreference' },
];

export default function OnboardingScreen({ onComplete }) {
  const { colors, changeTheme, theme } = useContext(ThemeContext);
  const { language, changeLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0); // 0 = welcome, 1 = language, 2 = theme, 3 = done
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (direction, callback) => {
    const out = direction === 'forward' ? -30 : 30;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: out, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'forward' ? 30 : -30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (step < 3) {
      animateTransition('forward', () => setStep(step + 1));
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    if (step > 0) {
      animateTransition('back', () => setStep(step - 1));
    }
  };

  const handleComplete = async () => {
    await setOnboardingComplete();
    onComplete();
  };

  const totalSteps = 4;
  const progress = (step + 1) / totalSteps;

  const renderWelcome = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircleLarge, { backgroundColor: colors.accentLight }]}>
        <Ionicons name="wallet" size={64} color={colors.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{i18n.t('appName')}</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {i18n.t('aboutDescription')}
      </Text>
      <View style={styles.featureList}>
        {[
          { icon: 'globe-outline', text: i18n.t('featureMultiCurrency') },
          { icon: 'cloud-outline', text: i18n.t('featureCloudSync') },
          { icon: 'shield-checkmark-outline', text: i18n.t('featureSecure') },
          { icon: 'airplane-outline', text: i18n.t('featureOfflineFirst') },
        ].map((f, idx) => (
          <View key={idx} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name={f.icon} size={20} color={colors.accent} />
            </View>
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderLanguage = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircleLarge, { backgroundColor: colors.accentLight }]}>
        <Ionicons name="language" size={56} color={colors.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{i18n.t('selectLanguage')}</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {i18n.t('language')}
      </Text>
      <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.optionCard,
              {
                backgroundColor: language === lang.code ? colors.accentLight : colors.surface,
                borderColor: language === lang.code ? colors.accent : colors.border,
              },
            ]}
            onPress={() => changeLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionTitle, { color: language === lang.code ? colors.accent : colors.text }]}>
              {lang.name}
            </Text>
            {language === lang.code && (
              <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTheme = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircleLarge, { backgroundColor: colors.accentLight }]}>
        <Ionicons name="color-palette" size={56} color={colors.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{i18n.t('selectTheme')}</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {i18n.t('theme')}
      </Text>
      <View style={styles.themeGrid}>
        {themeOptions.map((opt) => (
          <TouchableOpacity
            key={opt.code}
            style={[
              styles.themeCard,
              {
                backgroundColor: theme === opt.code ? colors.accentLight : colors.surface,
                borderColor: theme === opt.code ? colors.accent : colors.border,
              },
            ]}
            onPress={() => changeTheme(opt.code)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={opt.icon}
              size={36}
              color={theme === opt.code ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.themeLabel, { color: theme === opt.code ? colors.accent : colors.text }]}>
              {i18n.t(opt.nameKey)}
            </Text>
            {theme === opt.code && (
              <View style={[styles.themeCheck, { backgroundColor: colors.accent }]}>
                <Ionicons name="checkmark" size={14} color={colors.onAccent} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDone = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircleLarge, { backgroundColor: colors.success + '20' }]}>
        <Ionicons name="checkmark-done" size={64} color={colors.success} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>{i18n.t('success')} 🎉</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {i18n.t('manageYourFinances')}
      </Text>
    </View>
  );

  const steps = [renderWelcome, renderLanguage, renderTheme, renderDone];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: colors.accent, width: `${progress * 100}%` },
            ]}
          />
        </View>
        <Text style={[styles.stepIndicator, { color: colors.textTertiary }]}>
          {step + 1} / {totalSteps}
        </Text>
      </View>

      {/* Step content */}
      <Animated.View
        style={[
          styles.stepContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {steps[step]()}
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.buttonRow}>
        {step > 0 ? (
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: colors.border }]}
            onPress={goBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.accent }]}
          onPress={goNext}
          activeOpacity={0.7}
        >
          <Text style={[styles.nextBtnText, { color: colors.onAccent }]}>
            {step === 0 ? i18n.t('getStarted') : step === 3 ? i18n.t('done') : i18n.t('next')}
          </Text>
          <Ionicons name={step === 3 ? 'checkmark' : 'arrow-forward'} size={20} color={colors.onAccent} />
        </TouchableOpacity>
      </View>

      {/* Skip for steps 0-2 */}
      {step < 3 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleComplete} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: colors.textTertiary }]}>
            {i18n.t('skip')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  stepContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  iconCircleLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 22,
    marginBottom: 28,
  },
  featureList: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  optionsList: {
    width: '100%',
    maxHeight: 300,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    position: 'relative',
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: {
    width: 50,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
