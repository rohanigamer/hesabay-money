import React, { useContext } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

/**
 * Modern card: soft shadow, generous radius, clean border
 */
export default function GlassCard({ children, style }) {
  const { colors } = useContext(ThemeContext);
  const r = colors.radius?.lg ?? 18;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.isDark ? colors.border : colors.borderLight,
          borderRadius: r,
          ...(Platform.OS === 'android' && {
            elevation: 4,
          }),
          ...(Platform.OS !== 'android' && {
            shadowColor: colors.isDark ? '#000' : '#64748B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: colors.isDark ? 0.35 : 0.07,
            shadowRadius: 12,
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
