import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Storage } from '../utils/Storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState('device');
  const [colors, setColors] = useState(getColors('light'));
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
    <ThemeContext.Provider value={{ theme, colors, changeTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

const getColors = (theme) => {
  if (theme === 'light') {
    return {
      // Clean backgrounds
      background: '#ffffff',
      backgroundSecondary: '#f8f9fa',
      
      // Surfaces
      surface: '#ffffff',
      
      // Text - clean and readable
      text: '#000000',
      textSecondary: '#6c757d',
      textTertiary: '#adb5bd',
      
      // Accent color
      accent: '#007AFF',
      accentLight: '#e7f3ff',
      
      // Borders
      border: '#e9ecef',
      
      // Status colors
      success: '#34C759',
      error: '#FF3B30',
      warning: '#FF9500',
    };
  }
  
  // Dark theme
  return {
    // Dark backgrounds
    background: '#000000',
    backgroundSecondary: '#1c1c1e',
    
    // Surfaces
    surface: '#2c2c2e',
    
    // Text
    text: '#ffffff',
    textSecondary: '#98989d',
    textTertiary: '#636366',
    
    // Accent color
    accent: '#0A84FF',
    accentLight: '#1a2332',
    
    // Borders
    border: '#38383a',
    
    // Status colors
    success: '#30D158',
    error: '#FF453A',
    warning: '#FF9F0A',
  };
};
