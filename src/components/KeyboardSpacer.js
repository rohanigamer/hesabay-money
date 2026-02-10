import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

/**
 * Smooth animated spacer that expands when the keyboard opens.
 * Drop this at the bottom of any ScrollView inside a modal form
 * to get a polished, spring-based keyboard transition.
 */
export default function KeyboardSpacer({ extraHeight = 0 }) {
  const height = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const kbHeight = e.endCoordinates.height;
      Animated.spring(height, {
        toValue: kbHeight + extraHeight,
        useNativeDriver: false,
        damping: 22,
        stiffness: 280,
        mass: 0.8,
      }).start();
    };

    const onHide = () => {
      Animated.spring(height, {
        toValue: 0,
        useNativeDriver: false,
        damping: 22,
        stiffness: 280,
        mass: 0.8,
      }).start();
    };

    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [extraHeight]);

  return <Animated.View style={{ height }} />;
}
