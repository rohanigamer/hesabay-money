import React, { useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../utils/i18n';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const getMenuItems = () => [
  {
    id: 1,
    title: i18n.t('customers'),
    icon: 'people',
    gradient: ['#D4AF37', '#F4D03F', '#FFD700'], // Premium Gold
    iconBg: 'rgba(255, 255, 255, 0.25)',
    screen: 'Customers',
  },
  {
    id: 2,
    title: i18n.t('transaction'),
    icon: 'swap-horizontal',
    gradient: ['#667eea', '#764ba2', '#8B5CF6'], // Premium Purple
    iconBg: 'rgba(255, 255, 255, 0.25)',
    screen: 'Transaction',
  },
  {
    id: 3,
    title: i18n.t('calculation'),
    icon: 'calculator',
    gradient: ['#f093fb', '#f5576c', '#EC4899'], // Premium Pink
    iconBg: 'rgba(255, 255, 255, 0.25)',
    screen: 'Calculation',
  },
  {
    id: 4,
    title: i18n.t('settings'),
    icon: 'settings',
    gradient: ['#4facfe', '#00f2fe', '#06B6D4'], // Premium Cyan
    iconBg: 'rgba(255, 255, 255, 0.25)',
    screen: 'Settings',
  },
  {
    id: 5,
    title: i18n.t('about'),
    icon: 'information-circle',
    gradient: ['#fa709a', '#fee140', '#F59E0B'], // Premium Coral
    iconBg: 'rgba(255, 255, 255, 0.25)',
    screen: 'About',
  },
];

export default function DashboardScreen({ navigation, setIsAuthenticated }) {
  const { colors } = useContext(ThemeContext);
  const menuItems = getMenuItems();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'AuthCheck' }],
    });
  };

  const gradientColors = colors.background === '#ffffff' 
    ? ['#f8f9fa', '#e9ecef', '#ffffff']
    : ['#0f0c29', '#302b63', '#24243e'];

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Header with Animation */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.logoBadge, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
              <LinearGradient
                colors={[colors.accent, colors.accentSecondary]}
                style={styles.logoGradient}
              >
                <Text style={[styles.logoText, { color: colors.background }]}>H</Text>
              </LinearGradient>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>{i18n.t('welcome')}</Text>
              <Text style={[styles.appName, { color: colors.text }]}>Hesabay Money</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutButton, { borderColor: colors.accent + '40', shadowColor: colors.accent }]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.accent + '25', colors.accentSecondary + '15']}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={22} color={colors.accent} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Premium Balance Card with Animation */}
        <Animated.View
          style={[
            styles.balanceCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.accent + '25', colors.accentSecondary + '15', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.balanceGradient, { borderColor: colors.accent + '40', shadowColor: colors.accent }]}
          >
            <View style={styles.balanceHeader}>
              <View>
                <Text style={[styles.balanceLabel, { color: colors.accent }]}>Total Balance</Text>
                <Text style={[styles.balanceSubLabel, { color: colors.textSecondary }]}>Available Funds</Text>
              </View>
              <View style={[styles.walletIconContainer, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="wallet" size={28} color={colors.accent} />
              </View>
            </View>
            <View style={styles.balanceAmountContainer}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
              <Text style={[styles.balanceAmount, { color: colors.text }]}>0.00</Text>
            </View>
            <View style={[styles.balanceFooter, { borderTopColor: colors.accent + '25' }]}>
              <View style={styles.balanceItem}>
                <View style={[styles.balanceIconContainer, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="arrow-up-circle" size={20} color={colors.success} />
                </View>
                <View style={styles.balanceItemTextContainer}>
                  <Text style={[styles.balanceItemLabel, { color: colors.textSecondary }]}>Income</Text>
                  <Text style={[styles.balanceItemValue, { color: colors.text }]}>$0</Text>
                </View>
              </View>
              <View style={[styles.balanceDivider, { backgroundColor: colors.accent + '30' }]} />
              <View style={styles.balanceItem}>
                <View style={[styles.balanceIconContainer, { backgroundColor: colors.error + '20' }]}>
                  <Ionicons name="arrow-down-circle" size={20} color={colors.error} />
                </View>
                <View style={styles.balanceItemTextContainer}>
                  <Text style={[styles.balanceItemLabel, { color: colors.textSecondary }]}>Expenses</Text>
                  <Text style={[styles.balanceItemValue, { color: colors.text }]}>$0</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Premium Menu Grid */}
        <Animated.View
          style={[
            styles.menuSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>Quick Access</Text>
            <View style={[styles.sectionUnderline, { backgroundColor: colors.accent }]} />
          </View>
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.85}
              >
                <Animated.View
                  style={[
                    styles.menuCard,
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateY: slideAnim.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 50 - index * 10],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={item.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.menuGradient}
                  >
                    <View style={[styles.iconWrapper, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon} size={36} color="#fff" />
                    </View>
                    <Text style={styles.menuItemText}>{item.title}</Text>
                    <View style={styles.menuItemArrow}>
                      <Ionicons name="arrow-forward" size={16} color="rgba(255, 255, 255, 0.7)" />
                    </View>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Premium Stats Cards */}
        <Animated.View
          style={[
            styles.statsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>Overview</Text>
            <View style={[styles.sectionUnderline, { backgroundColor: colors.accent }]} />
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={[colors.info + '25', colors.info + '10', 'transparent']}
                style={[styles.statGradient, { borderColor: colors.info + '30', shadowColor: colors.info }]}
              >
                <View style={[styles.statIconWrapper, { backgroundColor: colors.info + '25' }]}>
                  <Ionicons name="trending-up" size={30} color={colors.info} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>$0</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{i18n.t('totalBalance')}</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={[colors.error + '25', colors.error + '10', 'transparent']}
                style={[styles.statGradient, { borderColor: colors.error + '30', shadowColor: colors.error }]}
              >
                <View style={[styles.statIconWrapper, { backgroundColor: colors.error + '25' }]}>
                  <Ionicons name="arrow-down-circle" size={30} color={colors.error} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>$0</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{i18n.t('expenses')}</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient
                colors={[colors.success + '25', colors.success + '10', 'transparent']}
                style={[styles.statGradient, { borderColor: colors.success + '30', shadowColor: colors.success }]}
              >
                <View style={[styles.statIconWrapper, { backgroundColor: colors.success + '25' }]}>
                  <Ionicons name="arrow-up-circle" size={30} color={colors.success} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>$0</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{i18n.t('income')}</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 15,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logoutButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    marginBottom: 35,
    borderRadius: 28,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  balanceGradient: {
    padding: 28,
    borderWidth: 1.5,
    borderRadius: 28,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceSubLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  walletIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '600',
    marginRight: 6,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1.5,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  balanceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceItemTextContainer: {
    flex: 1,
  },
  balanceItemLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  balanceItemValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  balanceDivider: {
    width: 1.5,
    height: 30,
    marginHorizontal: 16,
  },
  menuSection: {
    marginBottom: 35,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
  },
  sectionUnderline: {
    width: 50,
    height: 3,
    borderRadius: 2,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: (width - 60) / 2,
    marginBottom: 18,
  },
  menuCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  menuGradient: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    position: 'relative',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  menuItemArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  statsSection: {
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
  },
  statIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
