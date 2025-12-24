import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Storage } from '../utils/Storage';
import BottomNavigation from '../components/BottomNavigation';
import GlassCard from '../components/GlassCard';
import { useFocusEffect } from '@react-navigation/native';

export default function CalculationScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { format, formatWithSign } = useCurrency();
  
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalBalance: 0,
    totalCustomerBalance: 0,
    totalCustomers: 0,
    totalTransactions: 0,
  });
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
      startAnimations();
    }, [])
  );

  const startAnimations = () => {
    headerAnim.setValue(0);
    cardsAnim.setValue(0);
    Animated.stagger(100, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(cardsAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const loadData = async () => {
    const [loadedStats, loadedCustomers, loadedTransactions] = await Promise.all([
      Storage.getStats(),
      Storage.getCustomers(),
      Storage.getTransactions(),
    ]);
    setStats(loadedStats);
    setCustomers(loadedCustomers);
    setTransactions(loadedTransactions);
  };

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <Text style={[styles.title, { color: colors.text }]}>Summary</Text>
        </Animated.View>

        {/* Net Balance Card */}
        <Animated.View
          style={{
            opacity: cardsAnim,
            transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <GlassCard style={styles.balanceCard}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
              Net Balance
            </Text>
            <Text style={[styles.balanceAmount, { color: stats.totalBalance >= 0 ? colors.success : colors.error }]}>
              {formatWithSign(stats.totalBalance)}
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Income & Expense Cards */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <StatCard
              icon="arrow-down"
              label="Total Income"
              value={format(stats.totalIncome)}
              color="#4CAF50"
            />
          </View>
          <View style={{ flex: 1 }}>
            <StatCard
              icon="arrow-up"
              label="Total Expenses"
              value={format(stats.totalExpenses)}
              color="#f44336"
            />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <StatCard
              icon="people"
              label="Customers"
              value={stats.totalCustomers.toString()}
              color="#2196F3"
            />
          </View>
          <View style={{ flex: 1 }}>
            <StatCard
              icon="receipt"
              label="Transactions"
              value={stats.totalTransactions.toString()}
              color="#FF9800"
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
              <Ionicons name="wallet" size={24} color="#9C27B0" />
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
                      {isIncome ? '+' : '-'}{format(item.amount)}
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

      <BottomNavigation navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 120 },
  header: { marginBottom: 20 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  
  balanceCard: { padding: 24, marginBottom: 16, alignItems: 'center' },
  balanceLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, includeFontPadding: false },
  balanceAmount: { fontSize: 42, fontWeight: '700', letterSpacing: -1, flexShrink: 0, includeFontPadding: false },
  
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { padding: 16, alignItems: 'center' },
  statIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4, textAlign: 'center', includeFontPadding: false },
  statValue: { fontSize: 20, fontWeight: '700', textAlign: 'center', flexShrink: 0, includeFontPadding: false },
  
  customerBalanceCard: { padding: 16, marginBottom: 16 },
  customerBalanceHeader: { flexDirection: 'row', alignItems: 'center' },
  customerBalanceLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4, includeFontPadding: false },
  customerBalanceValue: { fontSize: 24, fontWeight: '700', flexShrink: 0, includeFontPadding: false },
  
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  listCard: { overflow: 'hidden', marginBottom: 16 },
  
  customerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
