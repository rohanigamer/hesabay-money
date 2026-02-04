import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';

/**
 * AnimatedBackground - Simple clean background
 */
export default function AnimatedBackground({ children }) {
  const { colors, isDark } = useContext(ThemeContext);
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    shift.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shift]);

  const gradientColors = useMemo(() => {
    if (isDark) return [colors.gradientStart, colors.gradientEnd];
    return [colors.gradientStart, colors.gradientEnd, colors.accentLight];
  }, [colors, isDark]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          opacity: isDark ? 0.55 : 0.85,
          transform: [
            {
              translateX: shift.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] }),
            },
            {
              translateY: shift.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }),
            },
          ],
        }}
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
