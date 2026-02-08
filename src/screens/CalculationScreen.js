import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Storage } from '../utils/Storage';
import BottomNavigation from '../components/BottomNavigation';
import GlassCard from '../components/GlassCard';
import OfflineBanner from '../components/OfflineBanner';
import { SkeletonCalculation } from '../components/Skeleton';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_HEIGHT } from '../constants/layout';
import i18n from '../utils/i18n';

export default function CalculationScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { format, formatWithSign, walletBalances, refreshBalances, loadWallets, convert, canConvertTo, canConvertFrom, exchangeRates, primaryCurrency } = useCurrency();
  const [displayAsCurrency, setDisplayAsCurrency] = useState(null); // null = no conversion card

  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalBalance: 0,
    totalCustomerBalance: 0,
    totalCustomers: 0,
    totalTransactions: 0,
  });
  const [statsPerCurrency, setStatsPerCurrency] = useState({});
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadWallets();
      loadData();
      startAnimations();
    }, [loadWallets])
  );

  // Reset "display total in" selection when selected currency is no longer in wallets (e.g. removed in Settings)
  useEffect(() => {
    if (displayAsCurrency && walletBalances.length > 0) {
      const stillExists = walletBalances.some(w => (w.currencyCode || '').toUpperCase() === (displayAsCurrency || '').toUpperCase());
      if (!stillExists) setDisplayAsCurrency(null);
    }
  }, [walletBalances, displayAsCurrency]);

  const startAnimations = () => {
    headerAnim.setValue(0);
    cardsAnim.setValue(0);
    Animated.stagger(100, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(cardsAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedStats, loadedCustomers, loadedTransactions, perCurrency] = await Promise.all([
        Storage.getStats(),
        Storage.getCustomers(),
        Storage.getTransactions(),
        Storage.getStatsPerCurrency(),
      ]);
      setStats(loadedStats && typeof loadedStats === 'object' ? loadedStats : {
        totalIncome: 0, totalExpenses: 0, totalBalance: 0,
        totalCustomerBalance: 0, totalCustomers: 0, totalTransactions: 0,
      });
      setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
      setTransactions(Array.isArray(loadedTransactions) ? loadedTransactions : []);
      setStatsPerCurrency(perCurrency && typeof perCurrency === 'object' ? perCurrency : {});
      refreshBalances();
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error('CalculationScreen loadData:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Currencies we can convert to: only those that exist in current wallets (so removed currencies don't show)
  const allConvertibleCodes = [
    exchangeRates.baseCurrency,
    ...Object.keys(exchangeRates.rates || {}).filter(c => exchangeRates.rates[c] > 0),
  ].filter((c, i, a) => a.indexOf(c) === i);
  const walletCodes = (walletBalances || []).map(w => (w.currencyCode || '').toUpperCase());
  const convertibleCurrencies = allConvertibleCodes.filter(code => walletCodes.includes((code || '').toUpperCase()));

  const totalConverted = displayAsCurrency && walletBalances.length > 0
    ? walletBalances.reduce((sum, w) => {
        if (!canConvertFrom(w.currencyCode) || !canConvertTo(displayAsCurrency)) return sum;
        return sum + convert(w.balance ?? 0, w.currencyCode, displayAsCurrency);
      }, 0)
    : 0;
  const canShowConversion = convertibleCurrencies.length > 0 && walletBalances.length > 0;

  // Get top customers by balance
  const getTopCustomers = () => {
    return [...customers]
      .sort((a, b) => Math.abs(parseFloat(b.balance) || 0) - Math.abs(parseFloat(a.balance) || 0))
      .slice(0, 5);
  };

  // Get recent transactions
  const getRecentTransactions = () => {
    return transactions.slice(0, 5);
  };

  const StatCard = ({ icon, label, value, color, delay = 0 }) => (
    <Animated.View
      style={{
        opacity: cardsAnim,
        transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <GlassCard style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.statValue, { color: color }]}>{value}</Text>
      </GlassCard>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <OfflineBanner />
      {loading && !hasLoadedOnce.current ? (
        <View style={{ flex: 1, paddingTop: Math.max(insets.top, 12) + 12 }}>
          <SkeletonCalculation />
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 12) + 12, paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{i18n.t('summary')}</Text>
        </Animated.View>

        {/* Per-wallet balance cards */}
        {walletBalances.length > 0 ? (
          walletBalances.map((w, idx) => {
            const sc = statsPerCurrency[w.currencyCode] || { totalIncome: 0, totalExpenses: 0, totalBalance: 0 };
            const balance = w.balance ?? 0;
            return (
              <Animated.View
                key={w.id}
                style={{
                  opacity: cardsAnim,
                  transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                }}
              >
                <GlassCard style={[styles.balanceCard, { marginBottom: 12 }]}>
                  <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                    {w.currencyCode} Balance
                  </Text>
                  <Text style={[styles.balanceAmount, { color: balance >= 0 ? colors.success : colors.error }]}>
                    {formatWithSign(balance, w.currencyCode)}
                  </Text>
                  {displayAsCurrency && displayAsCurrency !== w.currencyCode && canConvertFrom(w.currencyCode) && canConvertTo(displayAsCurrency) && (
                    <Text style={[styles.convertedSub, { color: colors.textTertiary }]}>
                      ≈ {formatWithSign(convert(balance, w.currencyCode, displayAsCurrency), displayAsCurrency)}
                    </Text>
                  )}
                  <View style={styles.walletStatsRow}>
                    <View style={styles.walletStatItem}>
                      <Ionicons name="arrow-down" size={14} color={colors.success} />
                      <Text style={[styles.walletStatText, { color: colors.success }]}>{format(sc.totalIncome, w.currencyCode)}</Text>
                    </View>
                    <View style={[styles.walletStatDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.walletStatItem}>
                      <Ionicons name="arrow-up" size={14} color={colors.error} />
                      <Text style={[styles.walletStatText, { color: colors.error }]}>{format(sc.totalExpenses, w.currencyCode)}</Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          })
        ) : (
          <Animated.View
            style={{
              opacity: cardsAnim,
              transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}
          >
            <GlassCard style={styles.balanceCard}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Balance</Text>
              <Text style={[styles.balanceAmount, { color: stats.totalBalance >= 0 ? colors.success : colors.error }]}>
                {formatWithSign(stats.totalBalance)}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={{ marginTop: 12 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>{i18n.t('addCurrencyInSettingsFirst')}</Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>
        )}

        {/* Display total in / currency conversion */}
        {canShowConversion && (
          <Animated.View
            style={{
              opacity: cardsAnim,
              transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}
          >
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 4 }]}>{i18n.t('displayTotalIn')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {convertibleCurrencies.map((code) => {
                const selected = displayAsCurrency === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setDisplayAsCurrency(selected ? null : code)}
                    style={[
                      styles.convertChip,
                      { backgroundColor: selected ? colors.accent : colors.backgroundSecondary, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.convertChipText, { color: selected ? colors.onAccent : colors.text }]}>{code}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {displayAsCurrency && (
              <GlassCard style={[styles.balanceCard, { marginBottom: 16 }]}>
                <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                  {i18n.t('totalEquivalentIn')} {displayAsCurrency}
                </Text>
                <Text style={[styles.balanceAmount, { color: totalConverted >= 0 ? colors.success : colors.error }]}>
                  {formatWithSign(totalConverted, displayAsCurrency)}
                </Text>
              </GlassCard>
            )}
          </Animated.View>
        )}

        {/* Stats Cards */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <StatCard
              icon="people"
              label="Customers"
              value={stats.totalCustomers.toString()}
              color={colors.info}
            />
          </View>
          <View style={{ flex: 1 }}>
            <StatCard
              icon="receipt"
              label="Transactions"
              value={stats.totalTransactions.toString()}
              color={colors.warning}
            />
          </View>
        </View>

        {/* Customer Balance Card */}
        <Animated.View
          style={{
            opacity: cardsAnim,
            transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <GlassCard style={styles.customerBalanceCard}>
            <View style={styles.customerBalanceHeader}>
              <Ionicons name="wallet" size={24} color={colors.accent} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.customerBalanceLabel, { color: colors.textSecondary }]}>
                  Customer Balance
                </Text>
                <Text style={[styles.customerBalanceValue, { color: colors.text }]}>
                  {formatWithSign(stats.totalCustomerBalance)}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Top Customers */}
        {getTopCustomers().length > 0 && (
          <Animated.View
            style={{
              opacity: cardsAnim,
              transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Customers</Text>
            <GlassCard style={styles.listCard}>
              {getTopCustomers().map((customer, index) => (
                <View
                  key={customer.id}
                  style={[
                    styles.customerItem,
                    index < getTopCustomers().length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                    <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={[styles.customerName, { color: colors.text }]}>{customer.name}</Text>
                    <Text style={[styles.customerNumber, { color: colors.textTertiary }]}>
                      {customer.number || 'No phone'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.customerBalance,
                      { color: (parseFloat(customer.balance) || 0) < 0 ? colors.error : colors.success },
                    ]}
                  >
                    {formatWithSign(customer.balance)}
                  </Text>
                </View>
              ))}
            </GlassCard>
          </Animated.View>
        )}

        {/* Recent Activity */}
        {getRecentTransactions().length > 0 && (
          <Animated.View
            style={{
              opacity: cardsAnim,
              transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            <GlassCard style={styles.listCard}>
              {getRecentTransactions().map((item, index) => {
                const isIncome = item.type === 'income' || item.type === 'credit';
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.transactionItem,
                      index < getRecentTransactions().length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.transactionIcon,
                        { backgroundColor: isIncome ? colors.success + '15' : colors.error + '15' },
                      ]}
                    >
                      <Ionicons
                        name={isIncome ? 'arrow-down' : 'arrow-up'}
                        size={16}
                        color={isIncome ? colors.success : colors.error}
                      />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                      {item.customerName && (
                        <Text style={[styles.transactionMeta, { color: colors.textTertiary }]}>
                          {item.customerName}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.transactionAmount, { color: isIncome ? colors.success : colors.error }]}>
                      {isIncome ? '+' : '-'}{format(item.amount, item.currencyCode)}
                    </Text>
                  </View>
                );
              })}
            </GlassCard>
          </Animated.View>
        )}

        {/* Empty State */}
        {stats.totalTransactions === 0 && (
          <View style={styles.empty}>
            <Ionicons name="stats-chart-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Start adding transactions to see your summary
            </Text>
          </View>
        )}

      </ScrollView>
      )}

      <BottomNavigation navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  
  balanceCard: { padding: 28, marginBottom: 20, alignItems: 'center' },
  balanceLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  balanceAmount: { fontSize: 44, fontWeight: '800', letterSpacing: -1, flexShrink: 0 },
  convertedSub: { fontSize: 13, marginTop: 6, fontWeight: '500' },
  convertChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginRight: 8 },
  convertChipText: { fontSize: 14, fontWeight: '600' },
  walletStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 16 },
  walletStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  walletStatText: { fontSize: 13, fontWeight: '600' },
  walletStatDivider: { width: 1, height: 20 },
  
  row: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  statCard: { padding: 18, alignItems: 'center' },
  statIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4, textAlign: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', textAlign: 'center', flexShrink: 0 },
  
  customerBalanceCard: { padding: 16, marginBottom: 16 },
  customerBalanceHeader: { flexDirection: 'row', alignItems: 'center' },
  customerBalanceLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  customerBalanceValue: { fontSize: 24, fontWeight: '700', flexShrink: 0 },
  
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  listCard: { overflow: 'hidden', marginBottom: 16 },
  
  customerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '600' }, // avatar bg is custom; keep light text
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  customerNumber: { fontSize: 12 },
  customerBalance: { fontSize: 15, fontWeight: '600', flexShrink: 0, minWidth: 80, textAlign: 'right' },
  
  transactionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  transactionIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  transactionMeta: { fontSize: 11 },
  transactionAmount: { fontSize: 14, fontWeight: '600', flexShrink: 0, minWidth: 70, textAlign: 'right' },
  
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptySubtext: { fontSize: 14, textAlign: 'center', maxWidth: 250 },
});
