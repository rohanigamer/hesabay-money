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

const getColors = (theme) => {
  if (theme === 'light') {
    return {
      isDark: false,
      // Clean backgrounds
      background: '#ffffff',
      backgroundSecondary: '#f8f9fa',
      
      // Surfaces
      surface: '#ffffff',
      card: '#ffffff',
      
      // Text - clean and readable
      text: '#000000',
      textSecondary: '#6c757d',
      textTertiary: '#adb5bd',
      
      // Accent color
      accent: '#007AFF',
      accentLight: '#e7f3ff',
      onAccent: '#ffffff',
      onSurface: '#000000',

      // Informational color (used in About)
      info: '#0A84FF',

      // Gradient stops (used in About/AnimatedBackground)
      gradientStart: '#ffffff',
      gradientEnd: '#f1f5ff',
      
      // Borders
      border: '#e9ecef',

      // Shadows (soft, iOS-like; Android uses elevation elsewhere)
      shadow: 'rgba(15, 23, 42, 0.10)',

      // Radius scale
      radius: { sm: 10, md: 14, lg: 18, xl: 24 },
      
      // Status colors
      success: '#34C759',
      onSuccess: '#ffffff',
      error: '#FF3B30',
      onError: '#ffffff',
      warning: '#FF9500',
      onWarning: '#000000',
    };
  }
  
  // Dark theme
  return {
    isDark: true,
    // Dark backgrounds
    background: '#000000',
    backgroundSecondary: '#1c1c1e',
    
    // Surfaces
    surface: '#2c2c2e',
    card: '#2c2c2e',
    
    // Text
    text: '#ffffff',
    textSecondary: '#98989d',
    textTertiary: '#636366',
    
    // Accent color
    accent: '#0A84FF',
    accentLight: '#1a2332',
    onAccent: '#ffffff',
    onSurface: '#ffffff',

    // Informational color
    info: '#64D2FF',

    // Gradient stops
    gradientStart: '#0b0b0c',
    gradientEnd: '#1c1c1e',
    
    // Borders
    border: '#38383a',

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.35)',

    // Radius scale
    radius: { sm: 10, md: 14, lg: 18, xl: 24 },
    
    // Status colors
    success: '#30D158',
    onSuccess: '#000000',
    error: '#FF453A',
    onError: '#000000',
    warning: '#FF9F0A',
    onWarning: '#000000',
  };
};
