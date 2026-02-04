import { Animated } from 'react-native';

export const Motion = {
  spring: (value, toValue, config = {}) =>
    Animated.spring(value, {
      toValue,
      useNativeDriver: true,
      tension: 70,
      friction: 10,
      ...config,
    }),

  timing: (value, toValue, duration = 220, config = {}) =>
    Animated.timing(value, {
      toValue,
      duration,
      useNativeDriver: true,
      ...config,
    }),

  fadeUp: (opacity, translateY, { fromY = 10, toY = 0, duration = 260, delay = 0 } = {}) => {
    opacity.setValue(0);
    translateY.setValue(fromY);
    return Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: toY, delay, tension: 70, friction: 10, useNativeDriver: true }),
    ]);
  },
};

