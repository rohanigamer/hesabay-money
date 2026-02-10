import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

/**
 * Single skeleton placeholder (pulse animation).
 * Use width/height to match content shape.
 */
export function SkeletonBox({ width, height, style, borderRadius = 8 }) {
  const { colors, isDark } = useContext(ThemeContext);
  const opacity = useRef(new Animated.Value(0.35)).current;
  const bg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, backgroundColor: bg, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/**
 * Card-shaped skeleton (e.g. for wallet or list card).
 */
export function SkeletonCard({ style, children }) {
  const { colors } = useContext(ThemeContext);
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: 14 }, style]}>
      {children}
    </View>
  );
}

/**
 * Skeleton for Transaction screen: header, search bar, wallet card, list rows.
 */
export function SkeletonTransaction() {
  const { colors } = useContext(ThemeContext);
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <SkeletonBox width={160} height={32} borderRadius={10} />
        <SkeletonBox width={44} height={44} borderRadius={22} />
      </View>
      <SkeletonBox width="100%" height={48} style={styles.searchBar} />
      <SkeletonCard style={styles.walletCard}>
        <SkeletonBox width="100%" height={24} style={{ marginBottom: 8 }} />
        <SkeletonBox width="60%" height={28} style={{ marginBottom: 8 }} />
        <SkeletonBox width="100%" height={1} style={{ marginVertical: 4 }} />
        <SkeletonBox width="50%" height={20} />
      </SkeletonCard>
      <View style={styles.sectionRow}>
        <SkeletonBox width={80} height={20} />
        <SkeletonBox width={60} height={14} />
      </View>
      <SkeletonCard style={styles.listCard}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.listRow, i < 4 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <SkeletonBox width={36} height={36} borderRadius={10} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonBox width="70%" height={15} style={{ marginBottom: 6 }} />
              <SkeletonBox width="50%" height={11} />
            </View>
            <SkeletonBox width={72} height={18} borderRadius={6} />
          </View>
        ))}
      </SkeletonCard>
    </View>
  );
}

/**
 * Skeleton for Customers screen: header, search, customer list rows.
 */
export function SkeletonCustomers() {
  const { colors } = useContext(ThemeContext);
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <SkeletonBox width={120} height={32} borderRadius={10} />
        <SkeletonBox width={44} height={44} borderRadius={14} />
      </View>
      <SkeletonBox width="100%" height={48} style={styles.searchBar} />
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.customerRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SkeletonBox width={44} height={44} borderRadius={14} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonBox width="55%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonBox width="35%" height={12} />
          </View>
          <SkeletonBox width={60} height={18} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton for Calculation/Summary screen: header, stat cards, list.
 */
export function SkeletonCalculation() {
  const { colors } = useContext(ThemeContext);
  return (
    <View style={styles.container}>
      <SkeletonBox width={100} height={32} style={{ marginBottom: 24 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={{ flex: 1, minWidth: '30%', padding: 16 }}>
            <SkeletonBox width={40} height={40} borderRadius={12} style={{ marginBottom: 8 }} />
            <SkeletonBox width="80%" height={12} style={{ marginBottom: 6 }} />
            <SkeletonBox width="60%" height={20} />
          </SkeletonCard>
        ))}
      </View>
      <SkeletonCard style={styles.listCard}>
        <SkeletonBox width="40%" height={14} style={{ marginBottom: 12 }} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.listRow, i < 3 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <SkeletonBox width={36} height={36} borderRadius={10} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonBox width="50%" height={14} style={{ marginBottom: 4 }} />
              <SkeletonBox width="70%" height={11} />
            </View>
            <SkeletonBox width={64} height={16} borderRadius={6} />
          </View>
        ))}
      </SkeletonCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  searchBar: { marginBottom: 18, borderRadius: 10 },
  walletCard: { padding: 20, marginBottom: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  listCard: { overflow: 'hidden', marginBottom: 8, padding: 0 },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  customerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  transactionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
});
