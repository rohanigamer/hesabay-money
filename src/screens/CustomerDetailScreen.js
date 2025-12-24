import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Animated,
  Share,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Storage } from '../utils/Storage';
import { useFocusEffect } from '@react-navigation/native';

export default function CustomerDetailScreen({ navigation, route }) {
  const { colors } = useContext(ThemeContext);
  const { getSymbol, format, formatWithSign } = useCurrency();
  const { customerId } = route.params;
  
  // Data states
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  
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
  const [formData, setFormData] = useState({ amount: '', description: '' });
  const [editCustomerData, setEditCustomerData] = useState({ name: '', number: '' });
  const [editEntryData, setEditEntryData] = useState({ id: '', amount: '', description: '', type: '' });
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
    }, [customerId])
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

  const loadData = async () => {
    const customers = await Storage.getCustomers();
    const found = customers.find(c => c.id === customerId);
    setCustomer(found);
    if (found) {
      setEditCustomerData({ name: found.name, number: found.number || '' });
    }
    const txns = await Storage.getCustomerTransactions(customerId);
    setTransactions(txns);
  };

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
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    await Storage.addTransaction({
      amount: parseFloat(formData.amount),
      type: selectedType,
      description: formData.description || (selectedType === 'credit' ? 'Cash In' : 'Cash Out'),
      customerId: customer.id,
      customerName: customer.name,
    });
      setFormData({ amount: '', description: '' });
      setShowAddModal(false);
      loadData();
  };

  // Edit customer
  const handleEditCustomer = async () => {
    if (!editCustomerData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    await Storage.updateCustomer(customerId, {
      name: editCustomerData.name.trim(),
      number: editCustomerData.number.trim(),
    });
    setShowEditModal(false);
    loadData();
  };

  // Delete customer
  const handleDeleteCustomer = () => {
    setShowMenuModal(false);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteCustomer = async () => {
    if (deleteConfirmText.trim().toLowerCase() === customer.name.trim().toLowerCase()) {
      await Storage.deleteCustomer(customerId);
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Customer name does not match. Please try again.');
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
    await Storage.deleteTransaction(entryToDelete.id);
    setShowDeleteEntryModal(false);
    setEntryToDelete(null);
          loadData();
  };

  // Edit entry
  const openEditEntry = (item) => {
    setEditEntryData({
      id: item.id,
      amount: item.amount.toString(),
      description: item.description || '',
      type: item.type,
    });
    setShowEditEntryModal(true);
  };

  const handleEditEntry = async () => {
    if (!editEntryData.amount || parseFloat(editEntryData.amount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    
    // Delete old and add new (simple approach)
    await Storage.deleteTransaction(editEntryData.id);
    await Storage.addTransaction({
      amount: parseFloat(editEntryData.amount),
      type: editEntryData.type,
      description: editEntryData.description || (editEntryData.type === 'credit' ? 'Cash In' : 'Cash Out'),
      customerId: customer.id,
      customerName: customer.name,
    });
    
    setShowEditEntryModal(false);
    loadData();
  };

  // Share/Export PDF
  const handleSharePDF = async () => {
    const report = generateReport();
    try {
      await Share.share({
        message: report,
        title: `${customer.name} - Account Statement`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share report');
    }
  };

  // Generate text report
  const generateReport = () => {
    let report = `=== ACCOUNT STATEMENT ===\n\n`;
    report += `Customer: ${customer.name}\n`;
    report += `Phone: ${customer.number || 'N/A'}\n`;
    report += `Date: ${new Date().toLocaleDateString()}\n\n`;
    report += `--- SUMMARY ---\n`;
    report += `Net Balance: ${formatWithSign(customer.balance)}\n`;
    report += `Total In: ${format(totalIn)}\n`;
    report += `Total Out: ${format(totalOut)}\n`;
    report += `Total Entries: ${transactions.length}\n\n`;
    report += `--- TRANSACTIONS ---\n\n`;
    
    transactions.forEach((t, i) => {
      const type = (t.type === 'credit' || t.type === 'income') ? 'IN' : 'OUT';
      report += `${i + 1}. ${formatDateFull(t.createdAt)}\n`;
      report += `   ${type}: ${format(t.amount)}\n`;
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

  // Loading state
  if (!customer) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loading}>
          <Text style={{ color: colors.textSecondary }}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Calculate totals
  const totalIn = transactions.filter(t => t.type === 'credit' || t.type === 'income').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalOut = transactions.filter(t => t.type === 'debit' || t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const netBalance = parseFloat(customer.balance) || 0;

  // Calculate running balance
  const getRunningBalance = (index) => {
    let balance = netBalance;
    for (let i = 0; i < index; i++) {
      const t = filteredTransactions[i];
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'credit' || t.type === 'income') {
        balance -= amt;
      } else {
        balance += amt;
      }
    }
    return balance;
  };

  // Get date filter label
  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Select Date';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === '#ffffff' ? 'dark-content' : 'light-content'} />
      {/* Header */}
      <Animated.View style={[styles.header, { backgroundColor: colors.background, opacity: headerAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{customer.name}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
            {customer.number || 'Tap menu to edit details'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={handleSharePDF}>
            <Ionicons name="document-text-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowMenuModal(true)}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        </Animated.View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by remark or amount"
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
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: dateFilter !== 'all' ? '#e3f2fd' : 'transparent' }]}
          onPress={() => setShowDateModal(true)}
        >
          <Ionicons name="calendar-outline" size={16} color={dateFilter !== 'all' ? '#2196F3' : colors.textSecondary} />
          <Text style={[styles.filterText, { color: dateFilter !== 'all' ? '#2196F3' : colors.text }]}>{getDateFilterLabel()}</Text>
          <Ionicons name="chevron-down" size={16} color={dateFilter !== 'all' ? '#2196F3' : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: filterType !== 'all' ? '#e3f2fd' : 'transparent' }]}
          onPress={() => setFilterType(filterType === 'all' ? 'credit' : filterType === 'credit' ? 'debit' : 'all')}
        >
          <Text style={[styles.filterText, { color: filterType !== 'all' ? '#2196F3' : colors.text }]}>
            {filterType === 'all' ? 'Entry Type' : filterType === 'credit' ? 'Cash In' : 'Cash Out'}
                  </Text>
          <Ionicons name="chevron-down" size={16} color={filterType !== 'all' ? '#2196F3' : colors.textSecondary} />
        </TouchableOpacity>
                </View>

      <Animated.View style={{ flex: 1, opacity: contentAnim }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Net Balance</Text>
              <Text style={[styles.summaryValue, { color: netBalance < 0 ? colors.error : colors.text }]}>
                {formatWithSign(netBalance)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Total In (+)</Text>
              <Text style={[styles.summaryValueBlue]}>{format(totalIn)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Total Out (-)</Text>
              <Text style={[styles.summaryValueRed, { color: colors.error }]}>{format(totalOut)}</Text>
            </View>
            <TouchableOpacity style={styles.viewReportsBtn} onPress={() => setShowReportsModal(true)}>
              <Text style={styles.viewReportsText}>VIEW REPORTS</Text>
              <Ionicons name="chevron-forward" size={18} color="#2196F3" />
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
                const globalIndex = filteredTransactions.findIndex(t => t.id === item.id);
                const runningBal = getRunningBalance(globalIndex + 1);
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.transactionItem, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
                    onPress={() => openEditEntry(item)}
                    activeOpacity={0.7}
                  >
                      <View style={styles.transactionLeft}>
                      <View style={styles.badgeRow}>
                        <View style={[styles.typeBadge, { backgroundColor: isCredit ? '#e3f2fd' : '#ffebee' }]}>
                          <Text style={[styles.typeBadgeText, { color: isCredit ? '#2196F3' : colors.error }]}>
                            Cash
                          </Text>
                        </View>
                        {item.type === 'credit' && (
                          <View style={[styles.typeBadge, { backgroundColor: '#e8f5e9', marginLeft: 6 }]}>
                            <Text style={[styles.typeBadgeText, { color: '#4CAF50' }]}>Cash</Text>
                          </View>
                        )}
                      </View>
                      {item.description && (
                        <Text style={[styles.transactionDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                      <Text style={[styles.entryBy]}>
                        Entry by You <Text style={{ color: colors.textTertiary }}>at {formatTime(item.createdAt)}</Text>
                      </Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[styles.transactionAmount, { color: isCredit ? '#4CAF50' : colors.error }]}>
                        {format(item.amount)}
                      </Text>
                      <Text style={[styles.balanceAfter, { color: colors.textSecondary }]}>
                        Balance: {formatWithSign(runningBal)}
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
                {searchQuery || filterType !== 'all' || dateFilter !== 'all' ? 'No matching entries' : 'No entries yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {searchQuery || filterType !== 'all' || dateFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first entry below'}
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
            style={styles.cashInBtn}
            onPress={() => { setSelectedType('credit'); setFormData({ amount: '', description: '' }); setShowAddModal(true); }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.cashBtnText}>CASH IN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cashOutBtn}
            onPress={() => { setSelectedType('debit'); setFormData({ amount: '', description: '' }); setShowAddModal(true); }}
          >
            <Ionicons name="remove" size={20} color="#fff" />
            <Text style={styles.cashBtnText}>CASH OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Entry Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowAddModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedType === 'credit' ? 'Cash In' : 'Cash Out'}
            </Text>

            <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
              <TouchableOpacity
                style={[styles.typeBtn, selectedType === 'credit' && styles.typeBtnActive]}
                onPress={() => setSelectedType('credit')}
              >
                <Text style={[styles.typeBtnText2, { color: selectedType === 'credit' ? '#4CAF50' : colors.textSecondary }]}>
                  + CASH IN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, selectedType === 'debit' && styles.typeBtnActiveRed]}
                onPress={() => setSelectedType('debit')}
              >
                <Text style={[styles.typeBtnText2, { color: selectedType === 'debit' ? colors.error : colors.textSecondary }]}>
                  - CASH OUT
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.amountInputContainer, { borderColor: selectedType === 'credit' ? '#4CAF50' : colors.error }]}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{getSymbol()}</Text>
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
              placeholder="Add remark (optional)"
              placeholderTextColor={colors.textTertiary}
              value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: selectedType === 'credit' ? '#4CAF50' : colors.error }]}
              onPress={handleAdd}
            >
              <Text style={styles.submitBtnText}>SAVE ENTRY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal visible={showEditEntryModal} animationType="slide" transparent onRequestClose={() => setShowEditEntryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowEditEntryModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Entry</Text>

            <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
              <TouchableOpacity
                style={[styles.typeBtn, editEntryData.type === 'credit' && styles.typeBtnActive]}
                onPress={() => setEditEntryData({ ...editEntryData, type: 'credit' })}
              >
                <Text style={[styles.typeBtnText2, { color: editEntryData.type === 'credit' ? '#4CAF50' : colors.textSecondary }]}>
                  + CASH IN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, editEntryData.type === 'debit' && styles.typeBtnActiveRed]}
                onPress={() => setEditEntryData({ ...editEntryData, type: 'debit' })}
              >
                <Text style={[styles.typeBtnText2, { color: editEntryData.type === 'debit' ? colors.error : colors.textSecondary }]}>
                  - CASH OUT
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.amountInputContainer, { borderColor: editEntryData.type === 'credit' ? '#4CAF50' : colors.error }]}>
              <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{getSymbol()}</Text>
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
              placeholder="Add remark (optional)"
              placeholderTextColor={colors.textTertiary}
              value={editEntryData.description}
              onChangeText={(t) => setEditEntryData({ ...editEntryData, description: t })}
            />

            <View style={styles.editBtnRow}>
              <TouchableOpacity
                style={[styles.editDeleteBtn, { backgroundColor: '#ffebee' }]}
                onPress={() => handleDeleteEntry({ id: editEntryData.id, description: editEntryData.description, amount: editEntryData.amount, type: editEntryData.type })}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, { backgroundColor: editEntryData.type === 'credit' ? '#4CAF50' : colors.error }]}
                onPress={handleEditEntry}
              >
                <Text style={styles.submitBtnText}>UPDATE ENTRY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal visible={showMenuModal} animationType="fade" transparent onRequestClose={() => setShowMenuModal(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenuModal(false)}>
          <View style={[styles.menuContent, { backgroundColor: colors.background }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenuModal(false); setShowEditModal(true); }}>
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
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { setShowDeleteConfirmModal(false); setDeleteConfirmText(''); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Ionicons name="warning" size={48} color={colors.error} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.error }]}>Delete Customer</Text>
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
              placeholder="Type customer name here"
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
                <Text style={styles.submitBtnText}>DELETE PERMANENTLY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Entry Confirmation Modal */}
      <Modal visible={showDeleteEntryModal} animationType="slide" transparent onRequestClose={() => setShowDeleteEntryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { setShowDeleteEntryModal(false); setEntryToDelete(null); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Ionicons name="trash" size={48} color={colors.error} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.error }]}>Delete Entry</Text>
            {entryToDelete && (
              <>
                <View style={[styles.entryDeleteCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <View style={styles.entryDeleteRow}>
                    <Text style={[styles.entryDeleteLabel, { color: colors.textSecondary }]}>Type</Text>
                    <View style={[styles.typeBadge, { 
                      backgroundColor: (entryToDelete.type === 'credit' || entryToDelete.type === 'income') ? '#e3f2fd' : '#ffebee' 
                    }]}>
                      <Text style={[styles.typeBadgeText, { 
                        color: (entryToDelete.type === 'credit' || entryToDelete.type === 'income') ? '#2196F3' : colors.error 
                      }]}>
                        {(entryToDelete.type === 'credit' || entryToDelete.type === 'income') ? 'Cash In' : 'Cash Out'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.entryDeleteRow}>
                    <Text style={[styles.entryDeleteLabel, { color: colors.textSecondary }]}>Amount</Text>
                    <Text style={[styles.entryDeleteValue, { 
                      color: (entryToDelete.type === 'credit' || entryToDelete.type === 'income') ? '#4CAF50' : colors.error 
                    }]}>
                      {format(entryToDelete.amount)}
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
                    <Ionicons name="trash" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>DELETE ENTRY</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowEditModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Customer</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="Customer name"
              placeholderTextColor={colors.textTertiary}
              value={editCustomerData.name}
              onChangeText={(t) => setEditCustomerData({ ...editCustomerData, name: t })}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="Phone number (optional)"
              placeholderTextColor={colors.textTertiary}
              value={editCustomerData.number}
              onChangeText={(t) => setEditCustomerData({ ...editCustomerData, number: t })}
              keyboardType="phone-pad"
            />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#2196F3' }]} onPress={handleEditCustomer}>
              <Text style={styles.submitBtnText}>SAVE CHANGES</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Filter Modal */}
      <Modal visible={showDateModal} animationType="slide" transparent onRequestClose={() => setShowDateModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowDateModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Date</Text>

            {[
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.dateOption, dateFilter === opt.key && { backgroundColor: '#e3f2fd' }]}
                onPress={() => { setDateFilter(opt.key); setShowDateModal(false); }}
              >
                <Text style={[styles.dateOptionText, { color: dateFilter === opt.key ? '#2196F3' : colors.text }]}>
                  {opt.label}
                </Text>
                {dateFilter === opt.key && <Ionicons name="checkmark" size={22} color="#2196F3" />}
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
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reports</Text>

            <View style={[styles.reportCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Customer</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{customer.name}</Text>
            </View>

              <View style={styles.reportRow}>
              <View style={[styles.reportCard, styles.reportCardHalf, { backgroundColor: '#e8f5e9' }]}>
                <Text style={[styles.reportLabel, { color: '#4CAF50' }]}>Total In</Text>
                <Text style={[styles.reportValue, { color: '#4CAF50' }]}>{format(totalIn)}</Text>
              </View>
              <View style={[styles.reportCard, styles.reportCardHalf, { backgroundColor: '#ffebee' }]}>
                <Text style={[styles.reportLabel, { color: colors.error }]}>Total Out</Text>
                <Text style={[styles.reportValue, { color: colors.error }]}>{format(totalOut)}</Text>
              </View>
            </View>

            <View style={[styles.reportCard, { backgroundColor: netBalance >= 0 ? '#e3f2fd' : '#ffebee' }]}>
              <Text style={[styles.reportLabel, { color: netBalance >= 0 ? '#2196F3' : colors.error }]}>Net Balance</Text>
              <Text style={[styles.reportValueLarge, { color: netBalance >= 0 ? '#2196F3' : colors.error }]}>
                {formatWithSign(netBalance)}
              </Text>
            </View>

            <View style={[styles.reportCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Total Entries</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{transactions.length}</Text>
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#2196F3' }]} onPress={() => { setShowReportsModal(false); handleSharePDF(); }}>
              <Ionicons name="share-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>SHARE REPORT</Text>
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
  summaryValueBlue: { fontSize: 16, fontWeight: '600', color: '#2196F3', flexShrink: 0, minWidth: 100, textAlign: 'right' },
  summaryValueRed: { fontSize: 16, fontWeight: '600', flexShrink: 0, minWidth: 100, textAlign: 'right' },
  divider: { height: 1, marginVertical: 8 },
  viewReportsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 12, gap: 4 },
  viewReportsText: { fontSize: 14, fontWeight: '600', color: '#2196F3' },

  entriesCount: { textAlign: 'center', fontSize: 13, paddingVertical: 12 },
  dateHeader: { fontSize: 13, fontWeight: '500', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  transactionLeft: { flex: 1, gap: 6 },
  badgeRow: { flexDirection: 'row' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: '600' },
  transactionDesc: { fontSize: 13 },
  entryBy: { fontSize: 12, fontWeight: '500', color: '#2196F3' },
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
  cashInBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 8, gap: 6 },
  cashOutBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#c62828', paddingVertical: 14, borderRadius: 8, gap: 6 },
  cashBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  
  typeToggle: { flexDirection: 'row', borderRadius: 8, padding: 4, marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#e8f5e9' },
  typeBtnActiveRed: { backgroundColor: '#ffebee' },
  typeBtnText2: { fontSize: 14, fontWeight: '600' },
  
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderBottomWidth: 2, marginBottom: 20 },
  currencySymbol: { fontSize: 32, fontWeight: '300' },
  amountInputLarge: { fontSize: 48, fontWeight: '600', minWidth: 100, textAlign: 'center' },
  
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginLeft: 4 },
  input: { padding: 14, borderRadius: 8, fontSize: 16, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', paddingVertical: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  editBtnRow: { flexDirection: 'row', gap: 12 },
  editDeleteBtn: { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  editSaveBtn: { flex: 1, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 100 : 60, paddingRight: 16 },
  menuContent: { borderRadius: 12, padding: 8, minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
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
