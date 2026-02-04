import React, { createContext, useMemo, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Storage } from '../utils/Storage';

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
    setColors(getColors(activeTheme));
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
      // Modern light: soft neutral background
      background: '#FFFFFF',
      backgroundSecondary: '#F5F6F8',
      backgroundTertiary: '#EBECF0',

      surface: '#FFFFFF',
      card: '#FFFFFF',

      text: '#111827',
      textSecondary: '#6B7280',
      textTertiary: '#9CA3AF',

      // Primary accent - modern indigo
      accent: '#6366F1',
      accentLight: '#EEF2FF',
      onAccent: '#FFFFFF',
      onSurface: '#111827',

      info: '#3B82F6',
      gradientStart: '#FFFFFF',
      gradientEnd: '#F5F3FF',

      border: '#E5E7EB',
      borderLight: '#F3F4F6',

      shadow: 'rgba(0, 0, 0, 0.06)',
      shadowStrong: 'rgba(0, 0, 0, 0.12)',

      radius: { sm: 10, md: 14, lg: 18, xl: 24, full: 9999 },

      success: '#10B981',
      onSuccess: '#FFFFFF',
      error: '#EF4444',
      onError: '#FFFFFF',
      warning: '#F59E0B',
      onWarning: '#000000',
    };
  }

  // Dark theme - deep slate, not pure black
  return {
    ...base,
    isDark: true,
    background: '#0F0F12',
    backgroundSecondary: '#18181B',
    backgroundTertiary: '#27272A',

    surface: '#18181B',
    card: '#1F1F23',

    text: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textTertiary: '#71717A',

    accent: '#818CF8',
    accentLight: '#312E81',
    onAccent: '#FFFFFF',
    onSurface: '#FAFAFA',

    info: '#60A5FA',
    gradientStart: '#0F0F12',
    gradientEnd: '#1E1B4B',

    border: '#3F3F46',
    borderLight: '#27272A',

    shadow: 'rgba(0, 0, 0, 0.4)',
    shadowStrong: 'rgba(0, 0, 0, 0.6)',

    radius: { sm: 10, md: 14, lg: 18, xl: 24, full: 9999 },

    success: '#34D399',
    onSuccess: '#000000',
    error: '#F87171',
    onError: '#000000',
    warning: '#FBBF24',
    onWarning: '#000000',
  };
};
