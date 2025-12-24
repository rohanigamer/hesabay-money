import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

/**
 * Simple Card Component - Clean, no glass effect
 */
export default function GlassCard({ children, style }) {
  const { colors } = useContext(ThemeContext);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
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
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
