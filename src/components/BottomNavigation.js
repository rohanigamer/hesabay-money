import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import i18n from '../utils/i18n';
import { BOTTOM_NAV_HEIGHT } from '../constants/layout';

const navigationItemDefs = [
  { id: 'Transaction', labelKey: 'transaction', icon: 'wallet', iconOutline: 'wallet-outline' },
  { id: 'Customers', labelKey: 'customers', icon: 'people', iconOutline: 'people-outline' },
  { id: 'Calculation', labelKey: 'calculation', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
  { id: 'Settings', labelKey: 'settings', icon: 'settings', iconOutline: 'settings-outline' },
];

export default function BottomNavigation({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const currentRoute = route.name;

  // Compute labels at render time so they update when language changes
  const navigationItems = navigationItemDefs.map(item => ({
    ...item,
    label: i18n.t(item.labelKey),
  }));

  const scaleAnims = useRef(
    navigationItemDefs.reduce((acc, item) => {
      acc[item.id] = new Animated.Value(1);
      return acc;
    }, {})
  ).current;

  const indicatorAnims = useRef(
    navigationItemDefs.reduce((acc, item) => {
      acc[item.id] = new Animated.Value(item.id === currentRoute ? 1 : 0);
      return acc;
    }, {})
  ).current;

  useEffect(() => {
    navigationItemDefs.forEach((item) => {
      Animated.spring(indicatorAnims[item.id], {
        toValue: item.id === currentRoute ? 1 : 0,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }).start();
    });
  }, [currentRoute]);

  const handleNavigation = (routeName) => {
    if (currentRoute !== routeName) {
      Animated.spring(scaleAnims[routeName], {
        toValue: 0.88,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start(() => {
        Animated.spring(scaleAnims[routeName], {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }).start();
      });
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
            onPress={() => setTimeout(() => handleNavigation(item.id), 0)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
          >
            <Animated.View 
              style={[
                styles.iconContainer, 
                { 
                  transform: [{ scale: scaleAnims[item.id] }],
                }
              ]}
            >
              <Animated.View style={[
                styles.activeIndicator, 
                { 
                  backgroundColor: colors.accentMuted || colors.accentLight,
                  opacity: indicatorAnims[item.id],
                  transform: [{ 
                    scaleX: indicatorAnims[item.id].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    })
                  }],
                },
              ]} />
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: BOTTOM_NAV_HEIGHT + insets.bottom,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 10),
          ...(Platform.OS !== 'android' && {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          }),
          ...(Platform.OS === 'android' && { elevation: 8 }),
        },
      ]}
    >
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navContent: {
    flexDirection: 'row',
    paddingTop: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    marginBottom: 3,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
    height: 32,
  },
  activeIndicator: {
    position: 'absolute',
    width: 56,
    height: 32,
    borderRadius: 16,
    opacity: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
