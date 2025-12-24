import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import i18n from '../utils/i18n';

const navigationItems = [
  { id: 'Transaction', label: i18n.t('transaction'), icon: 'repeat', iconOutline: 'repeat-outline' },
  { id: 'Customers', label: i18n.t('customers'), icon: 'people', iconOutline: 'people-outline' },
  { id: 'Calculation', label: i18n.t('calculation'), icon: 'apps', iconOutline: 'apps-outline' },
  { id: 'Settings', label: i18n.t('settings'), icon: 'cog', iconOutline: 'cog-outline' },
];

export default function BottomNavigation({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const route = useRoute();
  const currentRoute = route.name;

  const scaleAnims = useRef(
    navigationItems.reduce((acc, item) => {
      acc[item.id] = new Animated.Value(1);
      return acc;
    }, {})
  ).current;

  useEffect(() => {
    navigationItems.forEach((item) => {
      const isActive = currentRoute === item.id;
      Animated.timing(scaleAnims[item.id], {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [currentRoute]);

  const handleNavigation = (routeName) => {
    if (currentRoute !== routeName) {
      // Simple press animation
      Animated.sequence([
        Animated.timing(scaleAnims[routeName], {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnims[routeName], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      navigation.navigate(routeName);
    }
  };

  const NavContent = () => (
    <View style={styles.navContent}>
      {navigationItems.map((item) => {
        const isActive = currentRoute === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => handleNavigation(item.id)}
            activeOpacity={0.7}
          >
            <Animated.View 
              style={[
                styles.iconContainer, 
                { 
                  transform: [{ scale: scaleAnims[item.id] }],
                  opacity: scaleAnims[item.id].interpolate({
                    inputRange: [0.85, 1],
                    outputRange: [0.6, 1],
                  }),
                }
              ]}
            >
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: colors.accentLight }]} />
              )}
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={24}
                color={isActive ? colors.accent : colors.textSecondary}
              />
            </Animated.View>
            <Animated.Text 
              style={[
                styles.label, 
                { 
                  color: isActive ? colors.accent : colors.textSecondary,
                  opacity: scaleAnims[item.id].interpolate({
                    inputRange: [0.85, 1],
                    outputRange: [0.6, 1],
                  }),
                }
              ]}
            >
              {item.label}
            </Animated.Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <NavContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  navContent: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    marginBottom: 2,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.3,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.1,
  },
});
