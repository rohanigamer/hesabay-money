import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

/**
 * AnimatedBackground - Simple clean background
 */
export default function AnimatedBackground({ children }) {
  const { colors } = useContext(ThemeContext);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
