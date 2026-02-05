import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Animated,
  Share,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Storage } from '../utils/Storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeedback } from '../context/FeedbackContext';
import i18n from '../utils/i18n';

export default function CustomerDetailScreen({ navigation, route }) {
  const { colors, isDark } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { getSymbol, format, formatWithSign, walletBalances, primaryCurrency } = useCurrency();
  const { toast } = useFeedback();
  const customerId = route.params?.customerId;
  
  // Data states
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showEditEntryModal, setShowEditEntryModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteEntryModal, setShowDeleteEntryModal] = useState(false);
  
  // Form states
  const [selectedType, setSelectedType] = useState('credit');
  const [formData, setFormData] = useState({ amount: '', description: '', currencyCode: null });
  const [editCustomerData, setEditCustomerData] = useState({ name: '', number: '' });
  const [editEntryData, setEditEntryData] = useState({ id: '', amount: '', description: '', type: '', currencyCode: null });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [entryToDelete, setEntryToDelete] = useState(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month, custom
  
  // Animation
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
      startAnimations();
    }, [customerId, loadData])
  );

  useEffect(() => {
    applyFilters();
  }, [transactions, searchQuery, filterType, dateFilter]);

  const startAnimations = () => {
    headerAnim.setValue(0);
    contentAnim.setValue(0);
    Animated.stagger(100, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(contentAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const loadData = useCallback(async () => {
    if (!customerId) {
      setLoadError('Invalid customer');
      setCustomer(null);
      return;
    }
    setLoadError(null);
    try {
      const [customers, txns] = await Promise.all([
        Storage.getCustomers(),
        Storage.getCustomerTransactions(customerId),
      ]);
      const found = customers.find(c => c.id === customerId);
      setCustomer(found ?? null);
      if (found) {
        setEditCustomerData({ name: found.name, number: found.number || '' });
        setLoadError(null);
      } else {
        setLoadError('Customer not found');
      }
      setTransactions(Array.isArray(txns) ? txns : []);
    } catch (err) {
      console.error('CustomerDetail loadData:', err);
      setLoadError(err?.message || 'Could not load data');
      toast({ type: 'error', title: 'Error', message: 'Could not load customer. Try again.' });
    }
  }, [customerId, toast]);

  const applyFilters = () => {
    let filtered = [...transactions];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(query) ||
        t.amount?.toString().includes(query)
      );
    }
    
    // Type filter
    if (filterType === 'credit') {
      filtered = filtered.filter(t => t.type === 'credit' || t.type === 'income');
    } else if (filterType === 'debit') {
      filtered = filtered.filter(t => t.type === 'debit' || t.type === 'expense');
    }
    
    // Date filter
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (dateFilter === 'today') {
      filtered = filtered.filter(t => new Date(t.createdAt) >= startOfDay);
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(t => new Date(t.createdAt) >= startOfWeek);
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(t => new Date(t.createdAt) >= startOfMonth);
    }
    
    setFilteredTransactions(filtered);
  };

  // Add new entry
  const handleAdd = async () => {
    if (!customer?.id) return;
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({ type: 'warning', title: 'Invalid amount', message: 'Enter a valid amount.' });
      return;
    }
    setActionLoading(true);
    try {
      const result = await Storage.addTransaction({
        amount: parseFloat(formData.amount),
        type: selectedType,
        description: formData.description || (selectedType === 'credit' ? 'Cash In' : 'Cash Out'),
        customerId: customer.id,
        customerName: customer.name,
        currencyCode: formData.currencyCode || primaryCurrency,
      });
      if (result) {
        setFormData({ amount: '', description: '', currencyCode: null });
        setShowAddModal(false);
        await loadData();
      } else {
        toast({ type: 'error', title: 'Error', message: 'Could not add entry. Try again.' });
      }
    } catch (err) {
      console.error('handleAdd:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not add entry.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Edit customer
  const handleEditCustomer = async () => {
    if (!editCustomerData.name.trim()) {
      toast({ type: 'warning', title: 'Missing name', message: 'Name is required.' });
      return;
    }
    setActionLoading(true);
    try {
      const updated = await Storage.updateCustomer(customerId, {
        name: editCustomerData.name.trim(),
        number: editCustomerData.number.trim(),
      });
      if (updated) {
        setShowEditModal(false);
        await loadData();
      } else {
        toast({ type: 'error', title: 'Error', message: 'Could not update customer.' });
      }
    } catch (err) {
      console.error('handleEditCustomer:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not update.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete customer
  const handleDeleteCustomer = () => {
    setShowMenuModal(false);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!customer) return;
    if (deleteConfirmText.trim().toLowerCase() !== customer.name.trim().toLowerCase()) {
      toast({ type: 'error', title: 'Name does not match', message: 'Type the exact customer name to confirm deletion.' });
      return;
    }
    setActionLoading(true);
    try {
      const ok = await Storage.deleteCustomer(customerId);
      if (ok) {
        setShowDeleteConfirmModal(false);
        setDeleteConfirmText('');
        navigation.goBack();
      } else {
        toast({ type: 'error', title: 'Error', message: 'Could not delete customer.' });
      }
    } catch (err) {
      console.error('confirmDeleteCustomer:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not delete.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete single entry
  const handleDeleteEntry = (item) => {
    setShowEditEntryModal(false);
    setShowDeleteEntryModal(true);
    setEntryToDelete(item);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    setActionLoading(true);
    try {
      await Storage.deleteTransaction(entryToDelete.id);
      setShowDeleteEntryModal(false);
      setEntryToDelete(null);
      await loadData();
    } catch (err) {
      console.error('confirmDeleteEntry:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not delete entry.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Edit entry
  const openEditEntry = (item) => {
    setEditEntryData({
      id: item.id,
      amount: item.amount.toString(),
      description: item.description || '',
      type: item.type,
      currencyCode: item.currencyCode || primaryCurrency,
    });
    setShowEditEntryModal(true);
  };

  const handleEditEntry = async () => {
    if (!customer?.id) return;
    if (!editEntryData.amount || parseFloat(editEntryData.amount) <= 0) {
      toast({ type: 'warning', title: 'Invalid amount', message: 'Enter a valid amount.' });
      return;
    }
    setActionLoading(true);
    try {
      await Storage.deleteTransaction(editEntryData.id);
      const result = await Storage.addTransaction({
        amount: parseFloat(editEntryData.amount),
        type: editEntryData.type,
        description: editEntryData.description || (editEntryData.type === 'credit' ? 'Cash In' : 'Cash Out'),
        customerId: customer.id,
        customerName: customer.name,
        currencyCode: editEntryData.currencyCode || primaryCurrency,
      });
      if (result) {
        setShowEditEntryModal(false);
        await loadData();
      } else {
        toast({ type: 'error', title: 'Error', message: 'Entry was removed but could not save changes. Try adding again.' });
      }
    } catch (err) {
      console.error('handleEditEntry:', err);
      toast({ type: 'error', title: 'Error', message: err?.message || 'Could not update entry.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Share/Export PDF
  const handleSharePDF = async () => {
    const report = generateReportText();
    try {
      await Share.share({
        message: report,
        title: `${customer.name} - Account Statement`,
      });
    } catch (error) {
      toast({ type: 'error', title: 'Share failed', message: 'Could not share report.' });
    }
  };

  // Generate text report (uses per-currency totals; run after totalsByCurrency is in scope)
  const generateReportText = () => {
    let report = `=== ACCOUNT STATEMENT ===\n\n`;
    report += `Customer: ${customer.name}\n`;
    report += `Phone: ${customer.number || 'N/A'}\n`;
    report += `Date: ${new Date().toLocaleDateString()}\n\n`;
    report += `--- SUMMARY ---\n`;
    currencyCodes.forEach(code => {
      const tot = totalsByCurrency[code] || { in: 0, out: 0, net: 0 };
      const net = code === primaryCurrency ? primaryNet : tot.net;
      report += `[${code}] Net: ${formatWithSign(net, code)} | In: ${format(tot.in, code)} | Out: ${format(tot.out, code)}\n`;
    });
    report += `Total Entries: ${transactions.length}\n\n`;
    report += `--- TRANSACTIONS ---\n\n`;
    transactions.forEach((t, i) => {
      const type = (t.type === 'credit' || t.type === 'income') ? 'IN' : 'OUT';
      report += `${i + 1}. ${formatDateFull(t.createdAt)}\n`;
      report += `   ${type}: ${format(t.amount, t.currencyCode)}\n`;
      report += `   ${t.description || 'No description'}\n\n`;
    });
    return report;
  };

  // Format helpers
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const formatDateHeader = (d) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatDateFull = (d) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  // Group transactions by date
  const groupedTransactions = () => {
    const groups = {};
    filteredTransactions.forEach(t => {
      const dateKey = new Date(t.createdAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = { date: t.createdAt, items: [] };
      }
      groups[dateKey].items.push(t);
    });
    return Object.values(groups);
  };

  // Loading / not found state
  if (!customer && !loadError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loading}>
          <Text style={{ color: colors.textSecondary }}>Loading...</Text>
        </View>
      </View>
    );
  }
  if (!customer && loadError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loading}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Customer not found</Text>
          <Text style={{ color: colors.textTertiary, marginTop: 8, textAlign: 'center' }}>
            {loadError === 'Invalid customer' ? 'Invalid or missing customer.' : 'They may have been deleted.'}
          </Text>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.accent, marginTop: 24, paddingHorizontal: 24 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.submitBtnText, { color: colors.onAccent }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Per-currency totals from transactions
  const totalsByCurrency = {};
  transactions.forEach(t => {
    const code = (t.currencyCode || primaryCurrency).toUpperCase();
    if (!totalsByCurrency[code]) totalsByCurrency[code] = { in: 0, out: 0 };
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'credit' || t.type === 'income') totalsByCurrency[code].in += amt;
    else if (t.type === 'debit' || t.type === 'expense') totalsByCurrency[code].out += amt;
  });
  Object.keys(totalsByCurrency).forEach(code => {
    totalsByCurrency[code].net = totalsByCurrency[code].in - totalsByCurrency[code].out;
  });

  // Running balance after each transaction (in that transaction's currency)
  const runningBalanceAfter = {};
  const sortedByDate = [...transactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const runningByCode = {};
  sortedByDate.forEach(t => {
    const code = (t.currencyCode || primaryCurrency).toUpperCase();
    runningByCode[code] = (runningByCode[code] ?? 0) + (t.type === 'credit' || t.type === 'income' ? parseFloat(t.amount) || 0 : -(parseFloat(t.amount) || 0));
    runningBalanceAfter[t.id] = runningByCode[code];
  });

  const primaryNet = (customer.balanceByCurrency && customer.balanceByCurrency[primaryCurrency]) != null
    ? customer.balanceByCurrency[primaryCurrency]
    : (parseFloat(customer.balance) || 0);
  const currencyCodes = Object.keys(totalsByCurrency).length ? Object.keys(totalsByCurrency) : [primaryCurrency];

  // Get date filter label
  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return i18n.t('today');
      case 'week': return i18n.t('thisWeek');
      case 'month': return i18n.t('thisMonth');
      default: return i18n.t('selectDate');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <Animated.View style={[styles.header, { backgroundColor: colors.background, opacity: headerAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{customer.name}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
            {customer.number || 'Tap menu to edit details'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleSharePDF} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setTimeout(() => setShowMenuModal(true), 0)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        </Animated.View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={i18n.t('searchByRemarkOrAmount')}
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <TouchableOpacity 
          style={[styles.filterBtn, { borderColor: colors.border }]}
          onPress={() => setTimeout(() => setShowFilterModal(true), 0)}
        >
          <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: dateFilter !== 'all' ? colors.accentLight : 'transparent' }]}
          onPress={() => setTimeout(() => setShowDateModal(true), 0)}
        >
          <Ionicons name="calendar-outline" size={16} color={dateFilter !== 'all' ? colors.info : colors.textSecondary} />
          <Text style={[styles.filterText, { color: dateFilter !== 'all' ? colors.info : colors.text }]}>{getDateFilterLabel()}</Text>
          <Ionicons name="chevron-down" size={16} color={dateFilter !== 'all' ? colors.info : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: filterType !== 'all' ? colors.accentLight : 'transparent' }]}
          onPress={() => setFilterType(filterType === 'all' ? 'credit' : filterType === 'credit' ? 'debit' : 'all')}
        >
          <Text style={[styles.filterText, { color: filterType !== 'all' ? colors.info : colors.text }]}>
            {filterType === 'all' ? i18n.t('entryType') : filterType === 'credit' ? i18n.t('cashIn') : i18n.t('cashOut')}
                  </Text>
          <Ionicons name="chevron-down" size={16} color={filterType !== 'all' ? colors.info : colors.textSecondary} />
        </TouchableOpacity>
                </View>

      <Animated.View style={{ flex: 1, opacity: contentAnim }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Summary Card — per currency */}
          <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            {currencyCodes.map((code) => {
              const tot = totalsByCurrency[code] || { in: 0, out: 0, net: 0 };
              const net = code === primaryCurrency ? primaryNet : tot.net;
              return (
                <View key={code}>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.text }]}>Net Balance ({code})</Text>
                    <Text style={[styles.summaryValue, { color: net < 0 ? colors.error : colors.text }]}>
                      {formatWithSign(net, code)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.text }]}>Total In (+)</Text>
                    <Text style={[styles.summaryValueBlue, { color: colors.info }]}>{format(tot.in, code)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.text }]}>Total Out (-)</Text>
                    <Text style={[styles.summaryValueRed, { color: colors.error }]}>{format(tot.out, code)}</Text>
                  </View>
                  {currencyCodes.indexOf(code) < currencyCodes.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })}
            <TouchableOpacity style={styles.viewReportsBtn} onPress={() => setTimeout(() => setShowReportsModal(true), 0)} activeOpacity={0.8}>
              <Text style={[styles.viewReportsText, { color: colors.info }]}>{i18n.t('viewReports')}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.info} />
            </TouchableOpacity>
          </View>

          {/* Entries Count */}
          <Text style={[styles.entriesCount, { color: colors.textSecondary }]}>
            Showing {filteredTransactions.length} entries
          </Text>

          {/* Transaction List */}
          {groupedTransactions().map((group, groupIndex) => (
            <View key={groupIndex}>
              <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>
                {formatDateHeader(group.date)}
              </Text>
              {group.items.map((item) => {
                const isCredit = item.type === 'credit' || item.type === 'income';
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.transactionItem, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
                    onPress={() => openEditEntry(item)}
                    activeOpacity={0.7}
                  >
                      <View style={styles.transactionLeft}>
                      <View style={styles.badgeRow}>
                        <View style={[styles.typeBadge, { backgroundColor: isCredit ? colors.accentLight : colors.error + '20' }]}>
                          <Text style={[styles.typeBadgeText, { color: isCredit ? colors.info : colors.error }]}>
                            Cash
                          </Text>
                        </View>
                        {item.type === 'credit' && (
                          <View style={[styles.typeBadge, { backgroundColor: colors.success + '20', marginLeft: 6 }]}>
                            <Text style={[styles.typeBadgeText, { color: colors.success }]}>Cash</Text>
                          </View>
                        )}
                      </View>
                      {item.description && (
                        <Text style={[styles.transactionDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                      <Text style={[styles.entryBy, { color: colors.info }]}>
                        Entry by You <Text style={{ color: colors.textTertiary }}>at {formatTime(item.createdAt)}</Text>
                      </Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[styles.transactionAmount, { color: isCredit ? colors.success : colors.error }]}>
                        {format(item.amount, item.currencyCode)}
                      </Text>
                      <Text style={[styles.balanceAfter, { color: colors.textSecondary }]}>
                        Balance: {formatWithSign(runningBalanceAfter[item.id] ?? 0, item.currencyCode || primaryCurrency)}
                      </Text>
                    </View>
                    </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {filteredTransactions.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery || filterType !== 'all' || dateFilter !== 'all' ? i18n.t('noMatchingEntries') : i18n.t('noEntriesYet')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {searchQuery || filterType !== 'all' || dateFilter !== 'all' ? i18n.t('tryAdjustingFilters') : i18n.t('addFirstEntryBelow')}
              </Text>
            </View>
          )}

          <View style={{ height: 180 }} />
        </ScrollView>
      </Animated.View>

      {/* Bottom Action Buttons */}
      <View style={[styles.bottomActionsWrapper, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.cashInBtn, { backgroundColor: colors.success }]}
            onPress={() => { setSelectedType('credit'); setFormData({ amount: '', description: '' }); setTimeout(() => setShowAddModal(true), 0); }}
          >
            <Ionicons name="add" size={20} color={colors.onSuccess} />
            <Text style={[styles.cashBtnText, { color: colors.onSuccess }]}>CASH IN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cashOutBtn, { backgroundColor: colors.error }]}
            onPress={() => { setSelectedType('debit'); setFormData({ amount: '', description: '' }); setTimeout(() => setShowAddModal(true), 0); }}
          >
            <Ionicons name="remove" size={20} color={colors.onError} />
            <Text style={[styles.cashBtnText, { color: colors.onError }]}>CASH OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Entry Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 20 : 0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setShowAddModal(false); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedType === 'credit' ? i18n.t('cashIn') : i18n.t('cashOut')}
            </Text>

            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
            <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
              <TouchableOpacity
                style={[styles.typeBtn, selectedType === 'credit' && { backgroundColor: colors.success + '20' }]}
                onPress={() => setSelectedType('credit')}
              >
                <Text style={[styles.typeBtnText2, { color: selectedType === 'credit' ? colors.success : colors.textSecondary }]}>
                  + CASH IN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, selectedType === 'debit' && { backgroundColor: colors.error + '20' }]}
                onPress={() => setSelectedType('debit')}
              >
                <Text style={[styles.typeBtnText2, { color: selectedType === 'debit' ? colors.error : colors.textSecondary }]}>
                  - CASH OUT
                </Text>
              </TouchableOpacity>
            </View>

            {walletBalances.length > 0 && (
              <View style={styles.walletSelectorRow}>
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

            <View style={[styles.amountInputContainer, { borderColor: selectedType === 'credit' ? colors.success : colors.error }]}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{getSymbol(formData.currencyCode || primaryCurrency)}</Text>
                <TextInput
                style={[styles.amountInputLarge, { color: colors.text }]}
                placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.amount}
                onChangeText={(t) => setFormData({ ...formData, amount: t.replace(/[^0-9.]/g, '') })}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder={i18n.t('addRemark')}
              placeholderTextColor={colors.textTertiary}
              value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: selectedType === 'credit' ? colors.success : colors.error, opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleAdd}
              disabled={actionLoading}
            >
              <Text style={[styles.submitBtnText, { color: selectedType === 'credit' ? colors.onSuccess : colors.onError }]}>{i18n.t('saveEntry')}</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal visible={showEditEntryModal} animationType="slide" transparent onRequestClose={() => setShowEditEntryModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 20 : 0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setShowEditEntryModal(false); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('updateEntry')}</Text>

            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
            <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
              <TouchableOpacity
                style={[styles.typeBtn, editEntryData.type === 'credit' && { backgroundColor: colors.success + '20' }]}
                onPress={() => setEditEntryData({ ...editEntryData, type: 'credit' })}
              >
                <Text style={[styles.typeBtnText2, { color: editEntryData.type === 'credit' ? colors.success : colors.textSecondary }]}>
                  + CASH IN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, editEntryData.type === 'debit' && { backgroundColor: colors.error + '20' }]}
                onPress={() => setEditEntryData({ ...editEntryData, type: 'debit' })}
              >
                <Text style={[styles.typeBtnText2, { color: editEntryData.type === 'debit' ? colors.error : colors.textSecondary }]}>
                  - CASH OUT
                </Text>
              </TouchableOpacity>
            </View>

            {walletBalances.length > 0 && (
              <View style={styles.walletSelectorRow}>
                <Text style={[styles.walletSelectorLabel, { color: colors.textSecondary }]}>Currency</Text>
                <View style={styles.walletSelectorChips}>
                  {walletBalances.map((w) => {
                    const selected = (editEntryData.currencyCode || primaryCurrency) === w.currencyCode;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.walletChip, { backgroundColor: selected ? colors.accentLight : colors.backgroundSecondary, borderColor: selected ? colors.accent : colors.border }]}
                        onPress={() => setEditEntryData({ ...editEntryData, currencyCode: w.currencyCode })}
                      >
                        <Text style={[styles.walletChipText, { color: selected ? colors.accent : colors.textSecondary }]}>{w.currencyCode}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={[styles.amountInputContainer, { borderColor: editEntryData.type === 'credit' ? colors.success : colors.error }]}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{getSymbol(editEntryData.currencyCode || primaryCurrency)}</Text>
              <TextInput
                style={[styles.amountInputLarge, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={editEntryData.amount}
                onChangeText={(t) => setEditEntryData({ ...editEntryData, amount: t.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder={i18n.t('addRemark')}
              placeholderTextColor={colors.textTertiary}
              value={editEntryData.description}
              onChangeText={(t) => setEditEntryData({ ...editEntryData, description: t })}
            />

            <View style={styles.editBtnRow}>
              <TouchableOpacity
                style={[styles.editDeleteBtn, { backgroundColor: colors.error + '15' }]}
                onPress={() => handleDeleteEntry({ id: editEntryData.id, description: editEntryData.description, amount: editEntryData.amount, type: editEntryData.type, currencyCode: editEntryData.currencyCode })}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, { backgroundColor: editEntryData.type === 'credit' ? colors.success : colors.error, opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleEditEntry}
                disabled={actionLoading}
              >
                <Text style={[styles.submitBtnText, { color: editEntryData.type === 'credit' ? colors.onSuccess : colors.onError }]}>{i18n.t('updateEntry')}</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Menu Modal */}
      <Modal visible={showMenuModal} animationType="fade" transparent onRequestClose={() => setShowMenuModal(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenuModal(false)}>
          <View style={[styles.menuContent, { backgroundColor: colors.background, shadowColor: colors.shadow }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenuModal(false); setTimeout(() => setShowEditModal(true), 0); }}>
              <Ionicons name="create-outline" size={22} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Edit Customer</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteCustomer}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={[styles.menuText, { color: colors.error }]}>Delete Customer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Customer Confirmation Modal */}
      <Modal visible={showDeleteConfirmModal} animationType="slide" transparent onRequestClose={() => setShowDeleteConfirmModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 20 : 0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setShowDeleteConfirmModal(false); setDeleteConfirmText(''); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Ionicons name="warning" size={48} color={colors.error} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.error }]}>Delete Customer</Text>
            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
            <Text style={[styles.deleteWarning, { color: colors.textSecondary }]}>
              This will permanently delete "{customer.name}" and all their {transactions.length} entries. This action cannot be undone.
            </Text>
            <Text style={[styles.deleteInstruction, { color: colors.text }]}>
              Type the customer name to confirm:
            </Text>
            <Text style={[styles.customerNameDisplay, { color: colors.accent }]}>
              {customer.name}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderWidth: 1, borderColor: colors.border }]}
                    placeholder={i18n.t('typeCustomerNameHere')}
              placeholderTextColor={colors.textTertiary}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.deleteButtonRow}>
              <TouchableOpacity
                style={[styles.cancelDeleteBtn, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => { setShowDeleteConfirmModal(false); setDeleteConfirmText(''); }}
              >
                <Text style={[styles.cancelDeleteText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { 
                  backgroundColor: deleteConfirmText.trim().toLowerCase() === customer.name.trim().toLowerCase() ? colors.error : colors.border,
                  opacity: deleteConfirmText.trim().toLowerCase() === customer.name.trim().toLowerCase() ? 1 : 0.5
                }]}
                onPress={confirmDeleteCustomer}
                disabled={deleteConfirmText.trim().toLowerCase() !== customer.name.trim().toLowerCase()}
              >
                <Text style={[styles.submitBtnText, { color: colors.onError }]}>DELETE PERMANENTLY</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Entry Confirmation Modal */}
      <Modal visible={showDeleteEntryModal} animationType="slide" transparent onRequestClose={() => setShowDeleteEntryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { setShowDeleteEntryModal(false); setEntryToDelete(null); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Ionicons name="trash" size={48} color={colors.error} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.error }]}>Delete Entry</Text>
            {entryToDelete && (
              <>
                  <View style={[styles.entryDeleteCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <View style={styles.entryDeleteRow}>
                    <Text style={[styles.entryDeleteLabel, { color: colors.textSecondary }]}>Type</Text>
                    <View style={[styles.typeBadge, { 
                      backgroundColor: (entryToDelete.type === 'credit' || entryToDelete.type === 'income') ? colors.accentLight : colors.error + '15'
                    }]}>
                      <Text style={[styles.typeBadgeText, { 
                        color: (entryToDelete.type === 'credit' || entryToDelete.type === 'income') ? colors.accent : colors.error 
                      }]}>
                        {(entryToDelete.type === 'credit' || entryToDelete.type === 'income') ? 'Cash In' : 'Cash Out'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.entryDeleteRow}>
                    <Text style={[styles.entryDeleteLabel, { color: colors.textSecondary }]}>Amount</Text>
                    <Text style={[styles.entryDeleteValue, { 
                      color: (entryToDelete.type === 'credit' || entryToDelete.type === 'income') ? colors.success : colors.error 
                    }]}>
                      {format(entryToDelete.amount, entryToDelete.currencyCode)}
                    </Text>
                  </View>
                  {entryToDelete.description && (
                    <View style={styles.entryDeleteRow}>
                      <Text style={[styles.entryDeleteLabel, { color: colors.textSecondary }]}>Remark</Text>
                      <Text style={[styles.entryDeleteValue, { color: colors.text }]} numberOfLines={2}>
                        {entryToDelete.description}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.deleteWarning, { color: colors.textSecondary, marginTop: 16 }]}>
                  This will permanently delete this entry and update the customer balance. This action cannot be undone.
                </Text>
                <View style={styles.deleteButtonRow}>
                  <TouchableOpacity
                    style={[styles.cancelDeleteBtn, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => { setShowDeleteEntryModal(false); setEntryToDelete(null); }}
                  >
                    <Text style={[styles.cancelDeleteText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmDeleteBtn, { backgroundColor: colors.error }]}
                    onPress={confirmDeleteEntry}
                  >
                    <Ionicons name="trash" size={18} color={colors.onError} style={{ marginRight: 6 }} />
                    <Text style={[styles.submitBtnText, { color: colors.onError }]}>DELETE ENTRY</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 20 : 0}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setShowEditModal(false); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('editCustomer')}</Text>

            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={{ paddingBottom: 60 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{i18n.t('name')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder={i18n.t('customerName')}
              placeholderTextColor={colors.textTertiary}
              value={editCustomerData.name}
              onChangeText={(t) => setEditCustomerData({ ...editCustomerData, name: t })}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{i18n.t('phoneNumber')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder={i18n.t('phoneOptional')}
              placeholderTextColor={colors.textTertiary}
              value={editCustomerData.number}
              onChangeText={(t) => setEditCustomerData({ ...editCustomerData, number: t })}
              keyboardType="phone-pad"
            />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleEditCustomer}>
              <Text style={[styles.submitBtnText, { color: colors.onAccent }]}>{i18n.t('save')}</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Filter by Type Modal (Options button) */}
      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowFilterModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('filterByEntryType')}</Text>
            {[
              { key: 'all', label: i18n.t('allEntries') },
              { key: 'credit', label: i18n.t('cashInOnly') },
              { key: 'debit', label: i18n.t('cashOutOnly') },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.dateOption, filterType === opt.key && { backgroundColor: colors.accentLight }]}
                onPress={() => { setFilterType(opt.key); setShowFilterModal(false); }}
              >
                <Text style={[styles.dateOptionText, { color: filterType === opt.key ? colors.info : colors.text }]}>
                  {opt.label}
                </Text>
                {filterType === opt.key && <Ionicons name="checkmark" size={22} color={colors.info} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Date Filter Modal */}
      <Modal visible={showDateModal} animationType="slide" transparent onRequestClose={() => setShowDateModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowDateModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('filterByDate')}</Text>

            {[
              { key: 'all', label: i18n.t('allTime') },
              { key: 'today', label: i18n.t('today') },
              { key: 'week', label: i18n.t('thisWeek') },
              { key: 'month', label: i18n.t('thisMonth') },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.dateOption, dateFilter === opt.key && { backgroundColor: colors.accentLight }]}
                onPress={() => { setDateFilter(opt.key); setShowDateModal(false); }}
              >
                <Text style={[styles.dateOptionText, { color: dateFilter === opt.key ? colors.info : colors.text }]}>
                  {opt.label}
                </Text>
                {dateFilter === opt.key && <Ionicons name="checkmark" size={22} color={colors.info} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Reports Modal */}
      <Modal visible={showReportsModal} animationType="slide" transparent onRequestClose={() => setShowReportsModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowReportsModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('reports')}</Text>

            <View style={[styles.reportCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Customer</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{customer.name}</Text>
            </View>

            {currencyCodes.map((code) => {
              const tot = totalsByCurrency[code] || { in: 0, out: 0, net: 0 };
              const net = code === primaryCurrency ? primaryNet : tot.net;
              return (
                <View key={code}>
                  <Text style={[styles.reportLabel, { color: colors.textSecondary, marginBottom: 4 }]}>{code}</Text>
                  <View style={styles.reportRow}>
                    <View style={[styles.reportCard, styles.reportCardHalf, { backgroundColor: colors.success + '20' }]}>
                      <Text style={[styles.reportLabel, { color: colors.success }]}>Total In</Text>
                      <Text style={[styles.reportValue, { color: colors.success }]}>{format(tot.in, code)}</Text>
                    </View>
                    <View style={[styles.reportCard, styles.reportCardHalf, { backgroundColor: colors.error + '20' }]}>
                      <Text style={[styles.reportLabel, { color: colors.error }]}>Total Out</Text>
                      <Text style={[styles.reportValue, { color: colors.error }]}>{format(tot.out, code)}</Text>
                    </View>
                  </View>
                  <View style={[styles.reportCard, { backgroundColor: net >= 0 ? colors.accentLight : colors.error + '20', marginBottom: 12 }]}>
                    <Text style={[styles.reportLabel, { color: net >= 0 ? colors.info : colors.error }]}>Net Balance</Text>
                    <Text style={[styles.reportValueLarge, { color: net >= 0 ? colors.info : colors.error }]}>
                      {formatWithSign(net, code)}
                    </Text>
                  </View>
                </View>
              );
            })}

            <View style={[styles.reportCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Total Entries</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{transactions.length}</Text>
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent }]} onPress={() => { setShowReportsModal(false); handleSharePDF(); }}>
              <Ionicons name="share-outline" size={20} color={colors.onAccent} style={{ marginRight: 8 }} />
              <Text style={[styles.submitBtnText, { color: colors.onAccent }]}>SHARE REPORT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 180 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 12, paddingBottom: 12 },
  backBtn: { padding: 8, marginRight: 4 },
  headerCenter: { flex: 1, marginHorizontal: 8, minWidth: 0, maxWidth: '60%' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 8 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },

  filtersRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  filterText: { fontSize: 13 },

  summaryCard: { margin: 12, padding: 16, borderRadius: 8, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryLabel: { fontSize: 15, fontWeight: '500' },
  summaryValue: { fontSize: 18, fontWeight: '700', flexShrink: 0, minWidth: 100, textAlign: 'right' },
  summaryValueBlue: { fontSize: 16, fontWeight: '600', flexShrink: 0, minWidth: 100, textAlign: 'right' },
  summaryValueRed: { fontSize: 16, fontWeight: '600', flexShrink: 0, minWidth: 100, textAlign: 'right' },
  divider: { height: 1, marginVertical: 8 },
  viewReportsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 12, gap: 4 },
  viewReportsText: { fontSize: 14, fontWeight: '600' },

  entriesCount: { textAlign: 'center', fontSize: 13, paddingVertical: 12 },
  dateHeader: { fontSize: 13, fontWeight: '500', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  transactionLeft: { flex: 1, gap: 6 },
  badgeRow: { flexDirection: 'row' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: '600' },
  transactionDesc: { fontSize: 13 },
  entryBy: { fontSize: 12, fontWeight: '500' },
  transactionRight: { alignItems: 'flex-end', gap: 4, minWidth: 100 },
  transactionAmount: { fontSize: 16, fontWeight: '600', flexShrink: 0, textAlign: 'right' },
  balanceAfter: { fontSize: 12, flexShrink: 0, textAlign: 'right' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '500' },
  emptySubtext: { fontSize: 13 },

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
  cashInBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, gap: 6 },
  cashOutBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, gap: 6 },
  cashBtnText: { fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  
  walletSelectorRow: { marginBottom: 16 },
  walletSelectorLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  walletSelectorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  walletChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  walletChipText: { fontSize: 14, fontWeight: '600' },

  typeToggle: { flexDirection: 'row', borderRadius: 8, padding: 4, marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  typeBtnActive: {},
  typeBtnActiveRed: {},
  typeBtnText2: { fontSize: 14, fontWeight: '600' },
  
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderBottomWidth: 2, marginBottom: 20 },
  currencySymbol: { fontSize: 32, fontWeight: '300' },
  amountInputLarge: { fontSize: 48, fontWeight: '600', minWidth: 100, textAlign: 'center' },
  
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginLeft: 4 },
  input: { padding: 14, borderRadius: 8, fontSize: 16, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', paddingVertical: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '700' },

  editBtnRow: { flexDirection: 'row', gap: 12 },
  editDeleteBtn: { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  editSaveBtn: { flex: 1, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 100 : 60, paddingRight: 16 },
  menuContent: { borderRadius: 12, padding: 8, minWidth: 180, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '500' },
  menuDivider: { height: 1, marginVertical: 4 },

  dateOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 8, marginBottom: 8 },
  dateOptionText: { fontSize: 16, fontWeight: '500' },

  reportCard: { padding: 16, borderRadius: 8, marginBottom: 12 },
  reportCardHalf: { flex: 1 },
  reportRow: { flexDirection: 'row', gap: 12 },
  reportLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  reportValue: { fontSize: 18, fontWeight: '700' },
  reportValueLarge: { fontSize: 28, fontWeight: '700' },

  deleteWarning: { fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  deleteInstruction: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  customerNameDisplay: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16, paddingVertical: 8 },
  deleteButtonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelDeleteBtn: { flex: 1, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  cancelDeleteText: { fontSize: 15, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, flexDirection: 'row', paddingVertical: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  entryDeleteCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  entryDeleteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  entryDeleteLabel: { fontSize: 14, fontWeight: '500' },
  entryDeleteValue: { fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 16 },
});
