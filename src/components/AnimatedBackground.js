import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';

/**
 * Modern animated background: subtle gradient shift
 */
export default function AnimatedBackground({ children }) {
  const { colors, isDark } = useContext(ThemeContext);
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    shift.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shift, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shift, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shift]);

  const gradientColors = useMemo(() => {
    if (isDark) return [colors.gradientStart, colors.gradientEnd, colors.accentLight];
    return [colors.gradientStart, colors.gradientEnd, colors.accentLight];
  }, [colors, isDark]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: isDark ? 0.4 : 0.6,
            transform: [
              { translateX: shift.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] }) },
              { translateY: shift.interpolate({ inputRange: [0, 1], outputRange: [-15, 15] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
