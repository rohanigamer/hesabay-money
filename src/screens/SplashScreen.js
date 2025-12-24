import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to dashboard after 3 seconds (authentication will be handled in App.js)
    const timer = setTimeout(() => {
      try {
        if (navigation) {
          navigation.navigate('AuthCheck');
        } else {
          console.error('Navigation not available');
        }
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback: try again after a short delay
        setTimeout(() => {
          if (navigation) {
            navigation.navigate('AuthCheck');
          }
        }, 500);
      }
    }, 3000);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>H</Text>
          </View>
        </View>
        <Text style={styles.title}>Hesabay Money</Text>
        <Text style={styles.subtitle}>Manage Your Finances</Text>
        <View style={styles.loader}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    marginBottom: 40,
  },
  loader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e94560',
    marginHorizontal: 5,
  },
  dot1: {
    animationDelay: '0s',
  },
  dot2: {
    animationDelay: '0.2s',
  },
  dot3: {
    animationDelay: '0.4s',
  },
});

