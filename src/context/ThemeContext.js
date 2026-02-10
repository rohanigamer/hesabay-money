import React, { createContext, useMemo, useState, useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { Storage } from '../utils/Storage';
import * as NavigationBar from 'expo-navigation-bar';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState('device');
  const [colors, setColors] = useState(getColors('light'));
  const isDark = useMemo(() => colors?.isDark === true, [colors]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      updateColors();
    }
  }, [theme, systemTheme, isLoading]);

  const loadTheme = async () => {
    try {
      const savedTheme = await Storage.getTheme();
      setTheme(savedTheme || 'light');
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateColors = () => {
    let activeTheme = theme;
    if (theme === 'device') {
      activeTheme = systemTheme || 'light';
    }
    const newColors = getColors(activeTheme);
    setColors(newColors);

    // Set Android system navigation bar to transparent so modals extend behind it
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setPositionAsync('absolute');
        NavigationBar.setBackgroundColorAsync('transparent');
        NavigationBar.setButtonStyleAsync(activeTheme === 'dark' ? 'light' : 'dark');
      } catch (e) {
        // Ignore on unsupported platforms
      }
    }
  };

  const changeTheme = async (newTheme) => {
    await Storage.setTheme(newTheme);
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, changeTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Modern design system: spacing (px), typography scale, radius scale
const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
const typeScale = {
  display: 34,
  title: 28,
  title2: 22,
  headline: 17,
  body: 16,
  callout: 15,
  subhead: 14,
  footnote: 12,
  caption: 11,
};

const getColors = (theme) => {
  const base = {
    spacing,
    typeScale,
  };

  if (theme === 'light') {
    return {
      ...base,
      isDark: false,
      // Premium light: warm whites with depth
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FB',
      backgroundTertiary: '#F0F1F5',

      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      card: '#FFFFFF',

      text: '#0F172A',
      textSecondary: '#64748B',
      textTertiary: '#94A3B8',

      // Primary accent — vibrant indigo-violet
      accent: '#6366F1',
      accentHover: '#4F46E5',
      accentLight: '#EEF2FF',
      accentMuted: 'rgba(99, 102, 241, 0.08)',
      onAccent: '#FFFFFF',
      onSurface: '#0F172A',

      info: '#3B82F6',
      infoLight: '#EFF6FF',
      gradientStart: '#FFFFFF',
      gradientEnd: '#F5F3FF',

      border: '#E2E8F0',
      borderLight: '#F1F5F9',

      shadow: 'rgba(15, 23, 42, 0.06)',
      shadowStrong: 'rgba(15, 23, 42, 0.12)',
      shadowColor: '#6366F1',

      radius: { sm: 10, md: 14, lg: 18, xl: 24, full: 9999 },

      success: '#10B981',
      successLight: '#ECFDF5',
      onSuccess: '#FFFFFF',
      error: '#EF4444',
      errorLight: '#FEF2F2',
      onError: '#FFFFFF',
      warning: '#F59E0B',
      warningLight: '#FFFBEB',
      onWarning: '#000000',

      // Avatar palette for customer initials
      avatarColors: ['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#14B8A6', '#0EA5E9', '#F97316', '#84CC16'],
    };
  }

  // Dark theme — rich deep surfaces, not pure black
  return {
    ...base,
    isDark: true,
    background: '#0C0C10',
    backgroundSecondary: '#141418',
    backgroundTertiary: '#1E1E24',

    surface: '#1A1A20',
    surfaceElevated: '#222228',
    card: '#1A1A20',

    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',

    accent: '#818CF8',
    accentHover: '#A5B4FC',
    accentLight: '#1E1B4B',
    accentMuted: 'rgba(129, 140, 248, 0.12)',
    onAccent: '#FFFFFF',
    onSurface: '#F8FAFC',

    info: '#60A5FA',
    infoLight: '#1E3A5F',
    gradientStart: '#0C0C10',
    gradientEnd: '#1E1B4B',

    border: '#2D2D35',
    borderLight: '#1E1E24',

    shadow: 'rgba(0, 0, 0, 0.5)',
    shadowStrong: 'rgba(0, 0, 0, 0.7)',
    shadowColor: '#818CF8',

    radius: { sm: 10, md: 14, lg: 18, xl: 24, full: 9999 },

    success: '#34D399',
    successLight: '#064E3B',
    onSuccess: '#000000',
    error: '#FB7185',
    errorLight: '#4C0519',
    onError: '#000000',
    warning: '#FBBF24',
    warningLight: '#451A03',
    onWarning: '#000000',

    // Avatar palette for customer initials
    avatarColors: ['#818CF8', '#A78BFA', '#F472B6', '#FB7185', '#2DD4BF', '#38BDF8', '#FB923C', '#A3E635'],
  };
};
