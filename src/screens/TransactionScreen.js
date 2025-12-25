import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Storage } from '../utils/Storage';
import BottomNavigation from '../components/BottomNavigation';
import GlassCard from '../components/GlassCard';
import { useFocusEffect } from '@react-navigation/native';

export default function TransactionScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { getSymbol, format } = useCurrency();
  
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, totalBalance: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [selectedType, setSelectedType] = useState('income');
  const [formData, setFormData] = useState({ amount: '', description: '', customerId: null, customerName: '' });
  const [editData, setEditData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomerData, setNewCustomerData] = useState({ name: '', number: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
      startAnimations();
    }, [])
  );

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

  const loadData = async () => {
    const [loadedTransactions, loadedCustomers, loadedStats] = await Promise.all([
      Storage.getTransactions(),
      Storage.getCustomers(),
      Storage.getStats(),
    ]);
    setTransactions(loadedTransactions);
    setCustomers(loadedCustomers);
    setStats(loadedStats);
  };

  const handleAddTransaction = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const result = await Storage.addTransaction({
      amount: parseFloat(formData.amount),
      type: selectedType,
      description: formData.description || (selectedType === 'income' ? 'Income' : 'Expense'),
      customerId: formData.customerId,
      customerName: formData.customerName,
    });

    if (result) {
      setFormData({ amount: '', description: '', customerId: null, customerName: '' });
      setShowAddModal(false);
      loadData();
    }
  };

  const handleEditTransaction = async () => {
    if (!editData.amount || parseFloat(editData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const result = await Storage.updateTransaction(editData.id, {
      amount: parseFloat(editData.amount),
      type: editData.type,
      description: editData.description,
      customerId: editData.customerId,
      customerName: editData.customerName,
    });

    if (result) {
      setShowEditModal(false);
      setEditData(null);
      loadData();
    }
  };

  const handleDeleteTransaction = async () => {
    if (deleteData) {
      await Storage.deleteTransaction(deleteData.id);
      setShowDeleteModal(false);
      setDeleteData(null);
      loadData();
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    const result = await Storage.addCustomer({
      name: newCustomerData.name.trim(),
      number: newCustomerData.number.trim(),
      balance: 0,
    });

    if (result) {
      setNewCustomerData({ name: '', number: '' });
      setShowAddCustomerModal(false);
      loadData();
      // Auto-select the new customer
      const updatedCustomers = await Storage.getCustomers();
      const newCustomer = updatedCustomers.find(c => c.name === newCustomerData.name.trim());
      if (newCustomer) {
        setFormData({ ...formData, customerId: newCustomer.id, customerName: newCustomer.name });
      }
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
      Alert.alert('Error', 'Could not export report');
    }
  };

  // Export to CSV
  const exportToCSV = async () => {
    try {
      let csv = 'Date,Time,Type,Amount,Description,Customer\n';
      transactions.forEach(t => {
        const date = new Date(t.createdAt);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        const type = (t.type === 'income' || t.type === 'credit') ? 'Income' : 'Expense';
        const amount = t.amount;
        const desc = (t.description || '').replace(/,/g, ' ');
        const customer = (t.customerName || '').replace(/,/g, ' ');
        csv += `${dateStr},${timeStr},${type},${amount},${desc},${customer}\n`;
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
          Alert.alert('Exported', 'File saved to: ' + fileUri);
        }
      }
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Could not export CSV');
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
      report += `   ${type}: ${format(t.amount)}\n`;
      report += `   ${t.description || 'No description'}`;
      if (t.customerName) report += ` (${t.customerName})`;
      report += `\n\n`;
    });
    
    return report;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={true}>
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
          <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
          <TouchableOpacity 
            style={[styles.exportBtn, { backgroundColor: colors.accent }]} 
            onPress={() => setShowExportModal(true)}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View style={{ opacity: headerAnim }}>
          <View style={[styles.transSearchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.transSearchInput, { color: colors.text }]}
              placeholder="Search transactions..."
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

        {/* Balance Card */}
        <Animated.View
          style={{
            opacity: cardsAnim,
            transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <GlassCard style={styles.balanceCard}>
            <View style={styles.balanceContent}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Balance</Text>
              <Text style={[styles.balanceAmount, { color: colors.text }]}>{format(stats.totalBalance)}</Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Ionicons name="arrow-down" size={16} color={colors.success} />
                  <Text style={[styles.balanceItemLabel, { color: colors.textSecondary }]}>Income</Text>
                  <Text style={[styles.balanceItemValue, { color: colors.success }]}>{format(stats.totalIncome)}</Text>
                </View>
                <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />
                <View style={styles.balanceItem}>
                  <Ionicons name="arrow-up" size={16} color={colors.error} />
                  <Text style={[styles.balanceItemLabel, { color: colors.textSecondary }]}>Expense</Text>
                  <Text style={[styles.balanceItemValue, { color: colors.error }]}>{format(stats.totalExpenses)}</Text>
                </View>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Transactions List */}
        <Animated.View
          style={{
            opacity: listAnim,
            transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
            <Text style={[styles.entriesCount, { color: colors.textSecondary }]}>{transactions.length} entries</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Add your first transaction below</Text>
            </View>
          ) : (
            <>
              {groupedTransactions().map((group, groupIndex) => (
                <View key={groupIndex}>
                  <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>
                    {formatDateHeader(group.date)}
                  </Text>
                  <GlassCard style={styles.listCard}>
                    {group.items.map((item, index) => {
                      const isIncome = item.type === 'income' || item.type === 'credit';
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.transactionItem, index < group.items.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
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
                          <Text style={[styles.transactionAmount, { color: isIncome ? colors.success : colors.error }]}>
                            {isIncome ? '+' : '-'}{format(item.amount)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </GlassCard>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 180 }} />
        </Animated.View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={[styles.bottomActionsWrapper, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.cashInBtn}
            onPress={() => { setSelectedType('income'); setFormData({ amount: '', description: '', customerId: null, customerName: '' }); setShowAddModal(true); }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.cashBtnText}>CASH IN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cashOutBtn}
            onPress={() => { setSelectedType('expense'); setFormData({ amount: '', description: '', customerId: null, customerName: '' }); setShowAddModal(true); }}
          >
            <Ionicons name="remove" size={20} color="#fff" />
            <Text style={styles.cashBtnText}>CASH OUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setShowAddModal(false); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedType === 'income' ? 'Cash In' : 'Cash Out'}
            </Text>

            <ScrollView 
              style={{ width: '100%' }} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Type Toggle */}
              <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
                <TouchableOpacity
                  style={[styles.typeBtn, selectedType === 'income' && styles.typeBtnActive]}
                  onPress={() => setSelectedType('income')}
                >
                  <Text style={[styles.typeBtnText, { color: selectedType === 'income' ? colors.success : colors.textSecondary }]}>
                    + CASH IN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, selectedType === 'expense' && styles.typeBtnActiveRed]}
                  onPress={() => setSelectedType('expense')}
                >
                  <Text style={[styles.typeBtnText, { color: selectedType === 'expense' ? colors.error : colors.textSecondary }]}>
                    - CASH OUT
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <View style={styles.amountRow}>
                <Text style={[styles.currency, { color: colors.textSecondary }]}>{getSymbol()}</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  value={formData.amount}
                  onChangeText={(t) => setFormData({ ...formData, amount: t.replace(/[^0-9.]/g, '') })}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>

              {/* Description */}
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder="Description"
                placeholderTextColor={colors.textTertiary}
                value={formData.description}
                onChangeText={(t) => setFormData({ ...formData, description: t })}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              {/* Customer */}
              <TouchableOpacity
                style={[styles.input, styles.customerBtn, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => { Keyboard.dismiss(); setShowCustomerPicker(true); }}
              >
                <Text style={{ color: formData.customerName ? colors.text : colors.textTertiary }}>
                  {formData.customerName || 'Link to customer (optional)'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: selectedType === 'income' ? colors.success : colors.error }]}
                onPress={handleAddTransaction}
              >
                <Text style={styles.submitBtnText}>Add {selectedType === 'income' ? 'Income' : 'Expense'}</Text>
              </TouchableOpacity>
              
              {/* Extra space at bottom for keyboard */}
              <View style={{ height: 50 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setShowEditModal(false); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Transaction</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); openDeleteModal(editData); }} style={styles.deleteIconBtn}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ width: '100%' }} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {editData && (
                <>
                  {/* Type Toggle */}
                  <View style={[styles.typeToggle, { backgroundColor: colors.backgroundSecondary }]}>
                    <TouchableOpacity
                      style={[styles.typeBtn, (editData.type === 'income' || editData.type === 'credit') && styles.typeBtnActive]}
                      onPress={() => setEditData({ ...editData, type: 'income' })}
                    >
                      <Text style={[styles.typeBtnText, { color: (editData.type === 'income' || editData.type === 'credit') ? colors.success : colors.textSecondary }]}>
                        + CASH IN
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeBtn, (editData.type === 'expense' || editData.type === 'debit') && styles.typeBtnActiveRed]}
                      onPress={() => setEditData({ ...editData, type: 'expense' })}
                    >
                      <Text style={[styles.typeBtnText, { color: (editData.type === 'expense' || editData.type === 'debit') ? colors.error : colors.textSecondary }]}>
                        - CASH OUT
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Amount */}
                  <View style={styles.amountRow}>
                    <Text style={[styles.currency, { color: colors.textSecondary }]}>{getSymbol()}</Text>
                    <TextInput
                      style={[styles.amountInput, { color: colors.text }]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textTertiary}
                      value={editData.amount}
                      onChangeText={(t) => setEditData({ ...editData, amount: t.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                  </View>

                  {/* Description */}
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                    placeholder="Description"
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
                      {editData.customerName || 'Link to customer (optional)'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>

                  {/* Submit */}
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.accent }]}
                    onPress={handleEditTransaction}
                  >
                    <Text style={styles.submitBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                  
                  {/* Extra space at bottom for keyboard */}
                  <View style={{ height: 50 }} />
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowDeleteModal(false)} />
          <View style={[styles.deleteModalContent, { backgroundColor: colors.background }]}>
            <Ionicons name="trash-outline" size={48} color={colors.error} style={{ marginBottom: 16 }} />
            <Text style={[styles.deleteTitle, { color: colors.error }]}>Delete Transaction</Text>
            <Text style={[styles.deleteMessage, { color: colors.textSecondary }]}>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </Text>

            {deleteData && (
              <View style={[styles.deletePreview, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.deletePreviewAmount, { color: colors.text }]}>
                  {format(deleteData.amount)}
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
              >
                <Text style={[styles.deleteCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: colors.error }]}
                onPress={handleDeleteTransaction}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Picker */}
      <Modal visible={showCustomerPicker} animationType="slide" transparent onRequestClose={() => setShowCustomerPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCustomerPicker(false)} />
          <View style={[styles.pickerContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Customer</Text>
              <TouchableOpacity onPress={() => { setShowCustomerPicker(false); setShowAddCustomerModal(true); }} style={styles.addCustomerBtn}>
                <Ionicons name="add-circle" size={24} color={colors.accent} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search customers..."
                placeholderTextColor={colors.textTertiary}
                value={customerSearch}
                onChangeText={setCustomerSearch}
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
                if (showEditModal) {
                  setEditData({ ...editData, customerId: null, customerName: '' });
                } else {
                  setFormData({ ...formData, customerId: null, customerName: '' });
                }
                setShowCustomerPicker(false);
                setCustomerSearch('');
              }}
            >
              <Text style={{ color: colors.textSecondary }}>None</Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 300 }}>
              {filteredCustomers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    if (showEditModal) {
                      setEditData({ ...editData, customerId: c.id, customerName: c.name });
                    } else {
                      setFormData({ ...formData, customerId: c.id, customerName: c.name });
                    }
                    setShowCustomerPicker(false);
                    setCustomerSearch('');
                  }}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                    <Text style={styles.avatarText}>{c.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '500' }}>{c.name}</Text>
                    {c.number && <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{c.number}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
              {filteredCustomers.length === 0 && customerSearch.length > 0 && (
                <View style={styles.noResults}>
                  <Text style={{ color: colors.textSecondary }}>No customers found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal */}
      <Modal visible={showAddCustomerModal} animationType="slide" transparent onRequestClose={() => setShowAddCustomerModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { Keyboard.dismiss(); setShowAddCustomerModal(false); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Customer</Text>

            <ScrollView 
              style={{ width: '100%' }} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder="Customer Name *"
                placeholderTextColor={colors.textTertiary}
                value={newCustomerData.name}
                onChangeText={(t) => setNewCustomerData({ ...newCustomerData, name: t })}
                returnKeyType="next"
              />

              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder="Phone Number (optional)"
                placeholderTextColor={colors.textTertiary}
                value={newCustomerData.number}
                onChangeText={(t) => setNewCustomerData({ ...newCustomerData, number: t })}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.accent }]}
                onPress={handleAddCustomer}
              >
                <Text style={styles.submitBtnText}>Add Customer</Text>
              </TouchableOpacity>
              
              {/* Extra space at bottom for keyboard */}
              <View style={{ height: 50 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExportModal} animationType="fade" transparent onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowExportModal(false)} />
          <View style={[styles.exportModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Export Transactions</Text>
            
            <TouchableOpacity 
              style={[styles.exportOption, { backgroundColor: colors.backgroundSecondary }]} 
              onPress={exportToCSV}
            >
              <View style={[styles.exportIconBox, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="document-text-outline" size={24} color="#fff" />
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
              <View style={[styles.exportIconBox, { backgroundColor: '#FF5722' }]}>
                <Ionicons name="newspaper-outline" size={24} color="#fff" />
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

      <BottomNavigation navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 180 },
  header: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  exportBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  transSearchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 16, borderWidth: 1, gap: 10 },
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '600' },
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center', flex: 1 },
  deleteIconBtn: { padding: 4 },
  
  typeToggle: { flexDirection: 'row', borderRadius: 8, padding: 4, marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#e8f5e9' },
  typeBtnActiveRed: { backgroundColor: '#ffebee' },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
  
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  currency: { fontSize: 32, fontWeight: '300', marginRight: 4 },
  amountInput: { fontSize: 48, fontWeight: '600', minWidth: 120, textAlign: 'center' },
  
  input: { padding: 14, borderRadius: 12, fontSize: 16, marginBottom: 12 },
  customerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
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
  deleteConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  
  pickerContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, maxHeight: '80%' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  addCustomerBtn: { padding: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 0.5, gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  noResults: { paddingVertical: 40, alignItems: 'center' },
  
  exportModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  exportOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12 },
  exportIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  exportOptionText: { flex: 1 },
  exportOptionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  exportOptionDesc: { fontSize: 13 },
  cancelExportBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginTop: 4 },
});
