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
          borderColor: colors.border,
          borderRadius: r,
          ...(Platform.OS === 'android' && {
            elevation: 2,
          }),
          ...(Platform.OS !== 'android' && {
            shadowColor: colors.shadowStrong || colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
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
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
