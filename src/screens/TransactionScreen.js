import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  Platform,
  Animated,
  Share,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Storage } from '../utils/Storage';
import BottomNavigation from '../components/BottomNavigation';
import GlassCard from '../components/GlassCard';
import OfflineBanner from '../components/OfflineBanner';
import { SkeletonTransaction } from '../components/Skeleton';
import CalculatorInput from '../components/CalculatorInput';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_HEIGHT } from '../constants/layout';
import { useFeedback } from '../context/FeedbackContext';
import i18n from '../utils/i18n';

export default function TransactionScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useContext(ThemeContext);
  const { getSymbol, format, walletBalances, refreshBalances, primaryCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const { toast } = useFeedback();
  const isNarrow = screenWidth < 380;
  const amountFontSize = isNarrow ? 26 : (screenWidth < 420 ? 32 : 40);
  const currencyFontSize = isNarrow ? 20 : (screenWidth < 420 ? 24 : 26);
  
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, totalBalance: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [addCustomerSubmitting, setAddCustomerSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState('income');
  const [formData, setFormData] = useState({ amount: '', description: '', customerId: null, customerName: '', currencyCode: null });
  const [editData, setEditData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomerData, setNewCustomerData] = useState({ name: '', number: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [customerBtnHighlight, setCustomerBtnHighlight] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
      startAnimations();
    }, [])
  );

  // When a currency is removed in Settings, reset form/edit currency to a valid one
  useEffect(() => {
    if (walletBalances.length === 0) return;
    const codes = walletBalances.map(w => (w.currencyCode || '').toUpperCase());
    const primary = (primaryCurrency || '').toUpperCase();
    const formCode = (formData.currencyCode || primaryCurrency || '').toUpperCase();
    const editCode = editData ? (editData.currencyCode || '').toUpperCase() : '';
    if (formCode && !codes.includes(formCode)) {
      setFormData(prev => ({ ...prev, currencyCode: primary || codes[0] || null }));
    }
    if (editCode && !codes.includes(editCode)) {
      setEditData(prev => prev ? { ...prev, currencyCode: primary || codes[0] } : null);
    }
  }, [walletBalances, primaryCurrency]);

  const startAnimations = () => {
    headerAnim.setValue(0);
    cardsAnim.setValue(0);
    listAnim.setValue(0);

    Animated.stagger(80, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(cardsAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(listAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedTransactions, loadedCustomers, loadedStats] = await Promise.all([
        Storage.getTransactions(),
        Storage.getCustomers(),
        Storage.getStats(),
      ]);
      setTransactions(Array.isArray(loadedTransactions) ? loadedTransactions : []);
      setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
      setStats(loadedStats && typeof loadedStats === 'object' ? loadedStats : { totalIncome: 0, totalExpenses: 0, totalBalance: 0 });
      refreshBalances();
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error('Transaction loadData:', err);
      toast({ type: 'error', title: 'Error', message: 'Could not load data. Pull to refresh or try again.' });
    } finally {
      setLoading(false);
    }
  }, [refreshBalances, toast]);

  const handleAddTransaction = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({ type: 'warning', title: 'Invalid amount', message: 'Please enter a valid amount.' });
      return;
    }
    const currencyCode = formData.currencyCode || primaryCurrency;
    try {
      const result = await Storage.addTransaction({
        amount: parseFloat(formData.amount),
        type: selectedType,
        description: formData.description || (selectedType === 'income' ? 'Income' : 'Expense'),
        customerId: formData.customerId,
        customerName: formData.customerName,
        currencyCode,
      });
      if (result) {
        setFormData({ amount: '', description: '', customerId: null, customerName: '', currencyCode: null });
        setShowAddModal(false);
        toast({ type: 'success', title: 'Added', message: 'Transaction added.' });
        await loadData();
      } else {
        toast({ type: 'error', title: 'Error', message: 'Could not add transaction. Try again.' });
      }
    } catch (err) {
      console.error('handleAddTransaction:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not add transaction.' });
    }
  };

  const handleEditTransaction = async () => {
    if (!editData?.amount || parseFloat(editData.amount) <= 0) {
      toast({ type: 'warning', title: 'Invalid amount', message: 'Please enter a valid amount.' });
      return;
    }
    try {
      const result = await Storage.updateTransaction(editData.id, {
        amount: parseFloat(editData.amount),
        type: editData.type,
        description: editData.description,
        customerId: editData.customerId,
        customerName: editData.customerName,
        currencyCode: editData.currencyCode || primaryCurrency,
      });
      if (result) {
        setShowEditModal(false);
        setEditData(null);
        toast({ type: 'success', title: 'Updated', message: 'Transaction updated.' });
        await loadData();
      } else {
        toast({ type: 'error', title: 'Error', message: 'Could not update transaction.' });
      }
    } catch (err) {
      console.error('handleEditTransaction:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not update.' });
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deleteData) return;
    try {
      await Storage.deleteTransaction(deleteData.id);
      setShowDeleteModal(false);
      setDeleteData(null);
      toast({ type: 'success', title: 'Deleted', message: 'Transaction removed.' });
      await loadData();
    } catch (err) {
      console.error('handleDeleteTransaction:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not delete transaction.' });
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      toast({ type: 'warning', title: 'Missing name', message: 'Please enter customer name.' });
      return;
    }
    if (addCustomerSubmitting) return;
    setAddCustomerSubmitting(true);
    const addedName = newCustomerData.name.trim();
    const addedNumber = newCustomerData.number.trim();
    try {
      const result = await Storage.addCustomer({
        name: addedName,
        number: addedNumber,
      });
      if (result) {
        setNewCustomerData({ name: '', number: '' });
        setShowAddCustomerModal(false);
        await loadData();
        // Auto-select the new customer (use saved name; state was already cleared)
        const updatedCustomers = await Storage.getCustomers();
        const newCustomer = updatedCustomers.find(c => c.name === addedName);
        if (newCustomer) {
          setFormData(prev => ({ ...prev, customerId: newCustomer.id, customerName: newCustomer.name }));
        }
        toast({ type: 'success', title: 'Added', message: 'Customer added.' });
      } else {
        toast({ type: 'error', title: 'Error', message: 'Could not add customer.' });
      }
    } catch (err) {
      console.error('handleAddCustomer:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not add customer.' });
    } finally {
      setAddCustomerSubmitting(false);
    }
  };

  const openEditModal = (transaction) => {
    setEditData({
      id: transaction.id,
      amount: transaction.amount.toString(),
      description: transaction.description,
      type: transaction.type,
      customerId: transaction.customerId,
      customerName: transaction.customerName,
      currencyCode: transaction.currencyCode || primaryCurrency,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (transaction) => {
    setDeleteData(transaction);
    setShowDeleteModal(true);
  };

  const formatDateTime = (d) => {
    const date = new Date(d);
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${time} • ${dateStr}`;
  };

  const formatDateHeader = (d) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // Filter customers by search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.number && c.number.includes(customerSearch))
  );

  // Filter transactions by search
  const filteredTransactions = transactions.filter(t => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.description?.toLowerCase().includes(query) ||
      t.customerName?.toLowerCase().includes(query) ||
      t.amount?.toString().includes(query)
    );
  });

  // Group transactions by date for SectionList
  const transactionSections = React.useMemo(() => {
    const groups = {};
    filteredTransactions.forEach(t => {
      const dateKey = new Date(t.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = { date: t.createdAt, items: [] };
      }
      groups[dateKey].items.push(t);
    });
    return Object.values(groups).map(g => ({
      title: formatDateHeader(g.date),
      date: g.date,
      data: g.items,
    }));
  }, [filteredTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Export to PDF (text format)
  const exportToPDF = async () => {
    try {
      const report = generateTextReport();
      await Share.share({
        message: report,
        title: 'Transactions Report',
      });
      setShowExportModal(false);
    } catch (error) {
      toast({ type: 'error', title: 'Export failed', message: 'Could not export report.' });
    }
  };

  // Export to CSV
  // Properly escape CSV fields (handles commas, quotes, newlines)
  const escapeCSV = (field) => {
    const str = String(field || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportToCSV = async () => {
    try {
      let csv = 'Date,Time,Type,Amount,Currency,Description,Customer\n';
      transactions.forEach(t => {
        const date = new Date(t.createdAt);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        const type = (t.type === 'income' || t.type === 'credit') ? 'Income' : 'Expense';
        const amount = t.amount;
        const currency = t.currencyCode || primaryCurrency;
        const desc = escapeCSV(t.description);
        const customer = escapeCSV(t.customerName);
        csv += `${escapeCSV(dateStr)},${escapeCSV(timeStr)},${type},${amount},${currency},${desc},${customer}\n`;
      });

      if (Platform.OS === 'web') {
        // For web, use Share
        await Share.share({ message: csv, title: 'Transactions.csv' });
      } else {
        // For mobile, save and share file
        const fileUri = FileSystem.documentDirectory + 'transactions.csv';
        await FileSystem.writeAsStringAsync(fileUri, csv);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri);
        } else {
          toast({ type: 'success', title: 'Exported', message: 'File saved to: ' + fileUri });
        }
      }
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({ type: 'error', title: 'Export failed', message: 'Could not export CSV.' });
    }
  };

  // Generate text report
  const generateTextReport = () => {
    let report = `=== TRANSACTIONS REPORT ===\n`;
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    report += `--- SUMMARY ---\n`;
    report += `Total Income: ${format(stats.totalIncome)}\n`;
    report += `Total Expenses: ${format(stats.totalExpenses)}\n`;
    report += `Net Balance: ${format(stats.totalBalance)}\n`;
    report += `Total Transactions: ${transactions.length}\n\n`;
    report += `--- TRANSACTIONS ---\n\n`;
    
    transactions.forEach((t, i) => {
      const type = (t.type === 'income' || t.type === 'credit') ? 'IN' : 'OUT';
      report += `${i + 1}. ${formatDateTime(t.createdAt)}\n`;
      report += `   ${type}: ${format(t.amount, t.currencyCode)} ${t.currencyCode || ''}\n`;
      report += `   ${t.description || 'No description'}`;
      if (t.customerName) report += ` (${t.customerName})`;
      report += `\n\n`;
    });
    
    return report;
  };

  const listHeader = (
      <>
        {/* Header - button outside Animated.View so modal open works on Android */}
        <View style={styles.header}>
          <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }], flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{i18n.t('transaction')}</Text>
          </Animated.View>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.accent }]}
            onPress={() => setTimeout(() => setShowExportModal(true), 0)}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="download-outline" size={18} color={colors.onAccent} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <Animated.View style={{ opacity: headerAnim }}>
          <View style={[styles.transSearchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.transSearchInput, { color: colors.text }]}
              placeholder={i18n.t('searchTransactions')}
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Wallet Balances */}
        <Animated.View
          style={{
            opacity: cardsAnim,
            transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <GlassCard style={styles.balanceCard}>
            {walletBalances.length === 0 ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={[styles.noWalletsRow, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Ionicons name="wallet-outline" size={24} color={colors.accent} />
                <Text style={[styles.noWalletsText, { color: colors.textSecondary, flex: 1 }]}>{i18n.t('addCurrencyInSettingsFirst')}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </TouchableOpacity>
            ) : (
              <View style={styles.walletBalancesContent}>
                {walletBalances.map((w, idx) => (
                  <View
                    key={w.id}
                    style={[
                      styles.walletBalanceRow,
                      { borderColor: colors.border },
                      idx === walletBalances.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Text style={[styles.walletBalanceCode, { color: colors.textSecondary }]}>{w.currencyCode}</Text>
                    <Text style={[styles.walletBalanceAmount, { color: (w.balance ?? 0) < 0 ? colors.error : (w.balance ?? 0) > 0 ? colors.success : colors.text }]}>
                      {format(w.balance ?? 0, w.currencyCode)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* Section title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{i18n.t('recent')}</Text>
          <Text style={[styles.entriesCount, { color: colors.textSecondary }]}>{transactions.length} entries</Text>
        </View>
      </>
    );

    const renderTransactionItem = ({ item, index, section }) => {
      const isIncome = item.type === 'income' || item.type === 'credit';
      const isFirst = index === 0;
      const isLast = index === section.data.length - 1;
      return (
        <View
          style={[
            { backgroundColor: colors.surface, overflow: 'hidden' },
            isFirst && { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
            isLast && { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginBottom: 8 },
          ]}
        >
          <TouchableOpacity
            style={[styles.transactionItem, !isLast && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
            onPress={() => openEditModal(item)}
            activeOpacity={0.6}
          >
            <View style={[styles.transactionIcon, { backgroundColor: isIncome ? colors.success + '15' : colors.error + '15' }]}>
              <Ionicons name={isIncome ? 'arrow-down' : 'arrow-up'} size={18} color={isIncome ? colors.success : colors.error} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={1}>{item.description}</Text>
              <Text style={[styles.transactionMeta, { color: colors.textTertiary }]}>
                {item.customerName ? `${item.customerName} • ` : ''}{formatDateTime(item.createdAt)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.transactionAmount, { color: isIncome ? colors.success : colors.error }]}>
                {isIncome ? '+' : '-'}{format(item.amount, item.currencyCode)}
              </Text>
              {walletBalances.length > 1 && item.currencyCode && (
                <Text style={[styles.transactionCurrencyBadge, { color: colors.textTertiary }]}>{item.currencyCode}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      );
    };

    return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <OfflineBanner />
      {loading && !hasLoadedOnce.current ? (
        <View style={{ flex: 1 }}>
          <SkeletonTransaction />
        </View>
      ) : (
      <SectionList
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        sections={transactionSections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>{section.title}</Text>
        )}
        renderItem={renderTransactionItem}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Animated.View style={{ opacity: listAnim }}>
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{i18n.t('noTransactionsYet')}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>{i18n.t('addFirstTransaction')}</Text>
            </View>
          </Animated.View>
        }
        ListFooterComponent={<View style={{ height: 180 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      />
      )}

      {/* Bottom Action Buttons - responsive for small screens */}
      <View style={[styles.bottomActionsWrapper, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
        <View style={[styles.bottomActions, isNarrow && { paddingHorizontal: 12, gap: 8 }]}>
          <TouchableOpacity
            style={[styles.cashInBtn, { backgroundColor: colors.success }, isNarrow && styles.cashBtnNarrow]}
            onPress={() => {
              if (walletBalances.length === 0) {
                toast({ type: 'warning', title: 'No currency', message: i18n.t('addCurrencyInSettingsFirst') });
                return;
              }
              setSelectedType('income');
              setFormData({ amount: '', description: '', customerId: null, customerName: '', currencyCode: primaryCurrency });
              setTimeout(() => setShowAddModal(true), 0);
            }}
          >
            <Ionicons name="add" size={isNarrow ? 18 : 20} color={colors.onSuccess} />
            <Text style={[styles.cashBtnText, { color: colors.onSuccess }, isNarrow && styles.cashBtnTextNarrow]}>CASH IN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cashOutBtn, { backgroundColor: colors.error }, isNarrow && styles.cashBtnNarrow]}
            onPress={() => {
              if (walletBalances.length === 0) {
                toast({ type: 'warning', title: 'No currency', message: i18n.t('addCurrencyInSettingsFirst') });
                return;
              }
              setSelectedType('expense');
              setFormData({ amount: '', description: '', customerId: null, customerName: '', currencyCode: primaryCurrency });
              setTimeout(() => setShowAddModal(true), 0);
            }}
          >
            <Ionicons name="remove" size={isNarrow ? 18 : 20} color={colors.onError} />
            <Text style={[styles.cashBtnText, { color: colors.onError }, isNarrow && styles.cashBtnTextNarrow]}>CASH OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? (insets?.top ?? 0) + 20 : 0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setShowAddModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 20) + 24 }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedType === 'income' ? i18n.t('cashIn') : i18n.t('cashOut')}
            </Text>

            <ScrollView 
              style={{ width: '100%', maxHeight: '78%' }}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
              {/* Type Toggle */}
              <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
                <TouchableOpacity
                  style={[styles.typeBtn, selectedType === 'income' && { backgroundColor: colors.success + '20' }]}
                  onPress={() => setSelectedType('income')}
                >
                  <Text style={[styles.typeBtnText, { color: selectedType === 'income' ? colors.success : colors.textSecondary }]}>
                    + CASH IN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, selectedType === 'expense' && { backgroundColor: colors.error + '20' }]}
                  onPress={() => setSelectedType('expense')}
                >
                  <Text style={[styles.typeBtnText, { color: selectedType === 'expense' ? colors.error : colors.textSecondary }]}>
                    - CASH OUT
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Wallet selector */}
              {walletBalances.length > 0 && (
                <View style={[styles.walletSelectorRow, { marginBottom: 12 }]}>
                  <Text style={[styles.walletSelectorLabel, { color: colors.textSecondary }]}>Currency</Text>
                  <View style={styles.walletSelectorChips}>
                    {walletBalances.map((w) => {
                      const selected = (formData.currencyCode || primaryCurrency) === w.currencyCode;
                      return (
                        <TouchableOpacity
                          key={w.id}
                          style={[styles.walletChip, { backgroundColor: selected ? colors.accentLight : colors.backgroundSecondary, borderColor: selected ? colors.accent : colors.border }]}
                          onPress={() => setFormData(f => ({ ...f, currencyCode: w.currencyCode }))}
                        >
                          <Text style={[styles.walletChipText, { color: selected ? colors.accent : colors.textSecondary }]}>{w.currencyCode}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Amount - responsive row so currency + input + calculator stay on screen */}
              <View style={[styles.amountRow, styles.amountRowResponsive, { marginBottom: 16 }]}>
                <Text style={[styles.currency, { color: colors.textSecondary, fontSize: currencyFontSize }]} numberOfLines={1}>
                  {getSymbol(formData.currencyCode || primaryCurrency)}
                </Text>
                <View style={styles.amountInputWrapper}>
                  <CalculatorInput
                    style={[styles.amountInput, { color: colors.text, fontSize: amountFontSize }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    value={formData.amount}
                    onChangeText={(t) => {
                      let cleaned = t.replace(/[^0-9.]/g, '');
                      // Allow only one decimal point
                      const parts = cleaned.split('.');
                      if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
                      setFormData({ ...formData, amount: cleaned });
                    }}
                  />
                </View>
              </View>

              {/* Description */}
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={i18n.t('description')}
                placeholderTextColor={colors.textTertiary}
                value={formData.description}
                onChangeText={(t) => setFormData({ ...formData, description: t })}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              {/* Customer */}
              <TouchableOpacity
                onPress={() => { Keyboard.dismiss(); setShowCustomerPicker(true); }}
                activeOpacity={0.7}
                style={[styles.input, styles.customerBtn, { backgroundColor: customerBtnHighlight ? colors.accentLight : colors.backgroundSecondary }]}
              >
                <Text style={{ color: formData.customerName ? colors.text : colors.textTertiary }}>
                  {formData.customerName ? `✓ ${formData.customerName}` : i18n.t('linkToCustomer')}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: selectedType === 'income' ? colors.success : colors.error }]}
                onPress={handleAddTransaction}
                activeOpacity={0.8}
              >
                <Text style={[styles.submitBtnText, { color: selectedType === 'income' ? colors.onSuccess : colors.onError }]}>{selectedType === 'income' ? i18n.t('addIncome') : i18n.t('addExpense')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? (insets?.top ?? 0) + 20 : 0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setShowEditModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 20) + 24 }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('editTransaction')}</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); openDeleteModal(editData); }} style={styles.deleteIconBtn} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ width: '100%', maxHeight: '78%' }}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
              {editData && (
                <>
                  {/* Type Toggle */}
                  <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
                    <TouchableOpacity
                      style={[styles.typeBtn, (editData.type === 'income' || editData.type === 'credit') && { backgroundColor: colors.success + '20' }]}
                      onPress={() => setEditData({ ...editData, type: 'income' })}
                    >
                      <Text style={[styles.typeBtnText, { color: (editData.type === 'income' || editData.type === 'credit') ? colors.success : colors.textSecondary }]}>
                        + CASH IN
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeBtn, (editData.type === 'expense' || editData.type === 'debit') && { backgroundColor: colors.error + '20' }]}
                      onPress={() => setEditData({ ...editData, type: 'expense' })}
                    >
                      <Text style={[styles.typeBtnText, { color: (editData.type === 'expense' || editData.type === 'debit') ? colors.error : colors.textSecondary }]}>
                        - CASH OUT
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Wallet selector */}
                  {walletBalances.length > 0 && (
                    <View style={[styles.walletSelectorRow, { marginBottom: 12 }]}>
                      <Text style={[styles.walletSelectorLabel, { color: colors.textSecondary }]}>Currency</Text>
                      <View style={styles.walletSelectorChips}>
                        {walletBalances.map((w) => {
                          const selected = (editData.currencyCode || primaryCurrency) === w.currencyCode;
                          return (
                            <TouchableOpacity
                              key={w.id}
                              style={[styles.walletChip, { backgroundColor: selected ? colors.accentLight : colors.backgroundSecondary, borderColor: selected ? colors.accent : colors.border }]}
                              onPress={() => setEditData({ ...editData, currencyCode: w.currencyCode })}
                            >
                              <Text style={[styles.walletChipText, { color: selected ? colors.accent : colors.textSecondary }]}>{w.currencyCode}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Amount */}
                  <View style={[styles.amountRow, styles.amountRowResponsive, { marginBottom: 16 }]}>
                    <Text style={[styles.currency, { color: colors.textSecondary, fontSize: currencyFontSize }]} numberOfLines={1}>
                      {getSymbol(editData.currencyCode || primaryCurrency)}
                    </Text>
                    <View style={styles.amountInputWrapper}>
                      <CalculatorInput
                        style={[styles.amountInput, { color: colors.text, fontSize: amountFontSize }]}
                        placeholder="0.00"
                        placeholderTextColor={colors.textTertiary}
                        value={editData.amount}
                        onChangeText={(t) => {
                          let cleaned = t.replace(/[^0-9.]/g, '');
                          const parts = cleaned.split('.');
                          if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
                          setEditData({ ...editData, amount: cleaned });
                        }}
                      />
                    </View>
                  </View>

                  {/* Description */}
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                    placeholder={i18n.t('description')}
                    placeholderTextColor={colors.textTertiary}
                    value={editData.description}
                    onChangeText={(t) => setEditData({ ...editData, description: t })}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  {/* Customer */}
                  <TouchableOpacity
                    style={[styles.input, styles.customerBtn, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => { Keyboard.dismiss(); setShowCustomerPicker(true); }}
                  >
                    <Text style={{ color: editData.customerName ? colors.text : colors.textTertiary }}>
                      {editData.customerName || i18n.t('linkToCustomer')}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>

                  {/* Submit */}
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.accent }]}
                    onPress={handleEditTransaction}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.submitBtnText, { color: colors.onAccent }]}>{i18n.t('save')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowDeleteModal(false)} activeOpacity={1} />
          <View style={[styles.deleteModalContent, { backgroundColor: colors.background }]} pointerEvents="auto">
            <Ionicons name="trash-outline" size={48} color={colors.error} style={{ marginBottom: 16 }} />
            <Text style={[styles.deleteTitle, { color: colors.error }]}>{i18n.t('deleteTransaction')}</Text>
            <Text style={[styles.deleteMessage, { color: colors.textSecondary }]}>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </Text>

            {deleteData && (
              <View style={[styles.deletePreview, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.deletePreviewAmount, { color: colors.text }]}>
                  {format(deleteData.amount, deleteData.currencyCode)}
                </Text>
                <Text style={[styles.deletePreviewDesc, { color: colors.textSecondary }]}>
                  {deleteData.description}
                </Text>
              </View>
            )}

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.deleteCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: colors.error }]}
                onPress={handleDeleteTransaction}
                activeOpacity={0.8}
              >
                <Text style={[styles.deleteConfirmText, { color: colors.onError }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Picker - KeyboardAvoidingView so list stays visible when searching */}
      <Modal visible={showCustomerPicker} animationType="slide" transparent onRequestClose={() => setShowCustomerPicker(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? (insets?.top ?? 0) + 20 : 20}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setShowCustomerPicker(false); }} activeOpacity={1} />
            <View style={[styles.pickerContent, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 20) + 24 }]} pointerEvents="auto">
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <View style={styles.pickerHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('selectCustomer')}</Text>
                <TouchableOpacity onPress={() => { setShowCustomerPicker(false); setTimeout(() => setShowAddCustomerModal(true), 0); }} style={styles.addCustomerBtn}>
                  <Ionicons name="add-circle" size={24} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name="search" size={18} color={colors.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={i18n.t('searchCustomers')}
                  placeholderTextColor={colors.textTertiary}
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  returnKeyType="search"
                />
                {customerSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCustomerSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  Keyboard.dismiss();
                  if (showEditModal) {
                    setEditData({ ...editData, customerId: null, customerName: '' });
                  } else {
                    setFormData({ ...formData, customerId: null, customerName: '' });
                  }
                  setShowCustomerPicker(false);
                  setCustomerSearch('');
                }}
              >
                <Text style={{ color: colors.textSecondary }}>{i18n.t('none')}</Text>
              </TouchableOpacity>

              <ScrollView
                  style={{ maxHeight: 300 }}
                  contentContainerStyle={{ paddingBottom: 24 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={true}
                >
                {filteredCustomers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  Keyboard.dismiss();
                  if (showEditModal) {
                    setEditData({ ...editData, customerId: c.id, customerName: c.name });
                  } else {
                    setFormData({ ...formData, customerId: c.id, customerName: c.name });
                    setCustomerBtnHighlight(true);
                    setTimeout(() => setCustomerBtnHighlight(false), 1400);
                  }
                  setShowCustomerPicker(false);
                  setCustomerSearch('');
                }}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.avatarText, { color: colors.onAccent }]}>{c.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '500' }}>{c.name}</Text>
                      {c.number && <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{c.number}</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
                {filteredCustomers.length === 0 && customerSearch.length > 0 && (
                  <View style={styles.noResults}>
                    <Text style={{ color: colors.textSecondary }}>{i18n.t('noCustomersFound')}</Text>
                  </View>
                )}
                </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Customer Modal */}
      <Modal visible={showAddCustomerModal} animationType="slide" transparent onRequestClose={() => setShowAddCustomerModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? (insets?.top ?? 0) + 20 : 0}
        >
          <TouchableOpacity style={[styles.modalBackdrop, { zIndex: 0 }]} onPress={() => { Keyboard.dismiss(); setShowAddCustomerModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 20) + 24, zIndex: 1 }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('addCustomer')}</Text>

            <ScrollView 
              style={{ width: '100%', maxHeight: '85%' }}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={i18n.t('customerNameRequired')}
                placeholderTextColor={colors.textTertiary}
                value={newCustomerData.name}
                onChangeText={(t) => setNewCustomerData(prev => ({ ...prev, name: t }))}
                returnKeyType="next"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={i18n.t('phoneOptional')}
                placeholderTextColor={colors.textTertiary}
                value={newCustomerData.number}
                onChangeText={(t) => setNewCustomerData(prev => ({ ...prev, number: t }))}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <Pressable
                style={[styles.submitBtn, { backgroundColor: colors.accent }, addCustomerSubmitting && { opacity: 0.7 }]}
                onPress={handleAddCustomer}
                disabled={addCustomerSubmitting}
              >
                <Text style={[styles.submitBtnText, { color: colors.onAccent }]}>{addCustomerSubmitting ? '...' : i18n.t('addCustomer')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExportModal} animationType="fade" transparent onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowExportModal(false)} activeOpacity={1} />
          <View style={[styles.exportModalContent, { backgroundColor: colors.background }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('exportData')}</Text>
            
            <TouchableOpacity 
              style={[styles.exportOption, { backgroundColor: colors.backgroundSecondary }]} 
              onPress={exportToCSV}
            >
              <View style={[styles.exportIconBox, { backgroundColor: colors.success }]}>
                <Ionicons name="document-text-outline" size={24} color={colors.onSuccess} />
              </View>
              <View style={styles.exportOptionText}>
                <Text style={[styles.exportOptionTitle, { color: colors.text }]}>Export as CSV</Text>
                <Text style={[styles.exportOptionDesc, { color: colors.textSecondary }]}>Excel compatible spreadsheet</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.exportOption, { backgroundColor: colors.backgroundSecondary }]} 
              onPress={exportToPDF}
            >
              <View style={[styles.exportIconBox, { backgroundColor: colors.warning }]}>
                <Ionicons name="newspaper-outline" size={24} color={colors.onWarning} />
              </View>
              <View style={styles.exportOptionText}>
                <Text style={[styles.exportOptionTitle, { color: colors.text }]}>Share Report</Text>
                <Text style={[styles.exportOptionDesc, { color: colors.textSecondary }]}>Text format summary</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.cancelExportBtn, { borderColor: colors.border }]} 
              onPress={() => setShowExportModal(false)}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!showAddModal && !showEditModal && !showCustomerPicker && !showAddCustomerModal && !showExportModal && (
        <BottomNavigation navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  exportBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  transSearchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, marginBottom: 18, borderWidth: 1, gap: 10 },
  transSearchInput: { flex: 1, fontSize: 15, padding: 0 },
  balanceCard: { marginBottom: 24, padding: 20 },
  balanceContent: { alignItems: 'center' },
  balanceLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  balanceAmount: { fontSize: 40, fontWeight: '700', letterSpacing: -1, marginBottom: 16, flexShrink: 0 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  balanceItem: { flex: 1, alignItems: 'center', gap: 4 },
  balanceItemLabel: { fontSize: 12 },
  balanceItemValue: { fontSize: 16, fontWeight: '600', flexShrink: 0 },
  balanceDivider: { width: 1, height: 40, marginHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  entriesCount: { fontSize: 13 },
  dateHeader: { fontSize: 13, fontWeight: '500', marginTop: 16, marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptySubtext: { fontSize: 13 },
  listCard: { overflow: 'hidden', marginBottom: 8 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  transactionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  transactionMeta: { fontSize: 11 },
  transactionAmount: { fontSize: 15, fontWeight: '600', flexShrink: 0, minWidth: 80, textAlign: 'right' },
  transactionCurrencyBadge: { fontSize: 10, marginTop: 2 },
  walletBalancesContent: { gap: 8 },
  walletBalanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  walletBalanceCode: { fontSize: 13, fontWeight: '600' },
  walletBalanceAmount: { fontSize: 18, fontWeight: '700' },
  noWalletsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 14, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12 },
  noWalletsText: { fontSize: 14, flex: 1 },
  walletSelectorRow: {},
  walletSelectorLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  walletSelectorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  walletChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  walletChipText: { fontSize: 14, fontWeight: '600' },

  bottomActionsWrapper: { 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 88 : 72, 
    left: 0, 
    right: 0, 
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 12,
  },
  bottomActions: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    gap: 12,
  },
  cashInBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, gap: 6, minHeight: 48 },
  cashOutBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, gap: 6, minHeight: 48 },
  cashBtnNarrow: { paddingVertical: 12, paddingHorizontal: 6, borderRadius: 10, gap: 4 },
  cashBtnText: { fontSize: 14, fontWeight: '700' },
  cashBtnTextNarrow: { fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, minHeight: 0 },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center', flex: 1 },
  deleteIconBtn: { padding: 4 },
  
  typeToggle: { flexDirection: 'row', borderRadius: 8, padding: 4, marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  typeBtnActive: {},
  typeBtnActiveRed: {},
  typeBtnText: { fontSize: 14, fontWeight: '600' },
  
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  amountRowResponsive: { flexWrap: 'nowrap', paddingHorizontal: 4, minHeight: 48 },
  amountInputWrapper: { flex: 1, minWidth: 0, maxWidth: '100%', alignSelf: 'stretch', justifyContent: 'center' },
  currency: { fontWeight: '300', marginRight: 6 },
  amountInput: { fontWeight: '600', textAlign: 'center', minWidth: 0 },
  
  input: { padding: 14, borderRadius: 12, fontSize: 16, marginBottom: 12 },
  customerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '600' },
  
  deleteModalContent: { marginHorizontal: 20, borderRadius: 16, padding: 24, alignItems: 'center' },
  deleteTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  deleteMessage: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  deletePreview: { width: '100%', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20, alignItems: 'center' },
  deletePreviewAmount: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  deletePreviewDesc: { fontSize: 14 },
  deleteActions: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  deleteCancelText: { fontSize: 15, fontWeight: '600' },
  deleteConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  deleteConfirmText: { fontSize: 15, fontWeight: '600' },
  
  pickerContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, maxHeight: '80%' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  addCustomerBtn: { padding: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '600' },
  noResults: { paddingVertical: 40, alignItems: 'center' },
  
  exportModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  exportOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12 },
  exportIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  exportOptionText: { flex: 1 },
  exportOptionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  exportOptionDesc: { fontSize: 13 },
  cancelExportBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginTop: 4 },
});
