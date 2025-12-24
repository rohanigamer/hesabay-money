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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Storage } from '../utils/Storage';
import BottomNavigation from '../components/BottomNavigation';
import GlassCard from '../components/GlassCard';
import { useFocusEffect } from '@react-navigation/native';

export default function CustomersScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { formatWithSign } = useCurrency();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ name: '', number: '' });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
      startAnimations();
    }, [])
  );

  const startAnimations = () => {
    headerAnim.setValue(0);
    listAnim.setValue(0);
    Animated.stagger(80, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(listAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const loadCustomers = async () => {
    const data = await Storage.getCustomers();
    setCustomers(data);
    applyFilter(data, searchQuery);
  };

  const applyFilter = (data, query) => {
    let filtered = [...data];
    if (query.trim()) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.number.includes(query));
    }
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    setFilteredCustomers(filtered);
  };

  useEffect(() => {
    applyFilter(customers, searchQuery);
  }, [searchQuery]);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    const result = await Storage.addCustomer({ name: formData.name.trim(), number: formData.number.trim(), balance: 0 });
    if (result) {
      setFormData({ name: '', number: '' });
      setShowAddModal(false);
      loadCustomers();
    }
  };

  const handleEdit = async () => {
    if (!formData.name.trim() || !selectedCustomer) return;
    await Storage.updateCustomer(selectedCustomer.id, { name: formData.name.trim(), number: formData.number.trim() });
    setFormData({ name: '', number: '' });
    setSelectedCustomer(null);
    setShowEditModal(false);
    loadCustomers();
  };

  const openMenu = (customer, event) => {
    event.stopPropagation();
    setSelectedCustomer(customer);
    setShowMenuModal(true);
  };

  const openEdit = () => {
    if (!selectedCustomer) return;
    setFormData({ name: selectedCustomer.name, number: selectedCustomer.number || '' });
    setShowMenuModal(false);
    setShowEditModal(true);
  };

  const openDeleteConfirm = () => {
    setShowMenuModal(false);
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;
    if (deleteConfirmText.trim().toLowerCase() === selectedCustomer.name.trim().toLowerCase()) {
      await Storage.deleteCustomer(selectedCustomer.id);
      setShowDeleteConfirmModal(false);
      setDeleteConfirmText('');
      setSelectedCustomer(null);
      loadCustomers();
    } else {
      Alert.alert('Error', 'Customer name does not match. Please try again.');
    }
  };


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
          <Text style={[styles.title, { color: colors.text }]}>Customers</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Search */}
        <Animated.View style={{ opacity: headerAnim }}>
          <View style={[styles.searchBar, { backgroundColor: colors.glass, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search"
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

        {/* List */}
        <Animated.View
          style={{
            opacity: listAnim,
            transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          }}
        >
          {filteredCustomers.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'No results' : 'No customers yet'}
              </Text>
            </View>
          ) : (
            <GlassCard style={styles.listCard}>
              {filteredCustomers.map((customer, index) => (
                <TouchableOpacity
                  key={customer.id}
                  style={[styles.customerItem, index < filteredCustomers.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border }]}
                  onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
                  activeOpacity={0.6}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                    <Text style={styles.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={[styles.customerName, { color: colors.text }]}>{customer.name}</Text>
                    <Text style={[styles.customerNumber, { color: colors.textTertiary }]}>{customer.number}</Text>
                  </View>
                  <View style={styles.customerRight}>
                    <Text style={[styles.customerBalance, { color: (parseFloat(customer.balance) || 0) < 0 ? colors.error : colors.success }]}>
                      {formatWithSign(customer.balance)}
                    </Text>
                    <TouchableOpacity onPress={(e) => openMenu(customer, e)}>
                      <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </GlassCard>
          )}
        </Animated.View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowAddModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Customer</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="Name"
              placeholderTextColor={colors.textTertiary}
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
              autoFocus
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.textTertiary}
              value={formData.number}
              onChangeText={(t) => setFormData({ ...formData, number: t })}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleAdd}>
              <Text style={styles.submitBtnText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal visible={showMenuModal} animationType="fade" transparent onRequestClose={() => setShowMenuModal(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenuModal(false)}>
          <View style={[styles.menuContent, { backgroundColor: colors.background }]}>
            <TouchableOpacity style={styles.menuItem} onPress={openEdit}>
              <Ionicons name="create-outline" size={22} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Edit Customer</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuItem} onPress={openDeleteConfirm}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={[styles.menuText, { color: colors.error }]}>Delete Customer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowEditModal(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Customer</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="Name"
              placeholderTextColor={colors.textTertiary}
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="Phone"
              placeholderTextColor={colors.textTertiary}
              value={formData.number}
              onChangeText={(t) => setFormData({ ...formData, number: t })}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleEdit}>
              <Text style={styles.submitBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirmModal} animationType="slide" transparent onRequestClose={() => setShowDeleteConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { setShowDeleteConfirmModal(false); setDeleteConfirmText(''); }} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHandle} />
            <Ionicons name="warning" size={48} color={colors.error} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.error }]}>Delete Customer</Text>
            {selectedCustomer && (
              <>
                <Text style={[styles.deleteWarning, { color: colors.textSecondary }]}>
                  This will permanently delete "{selectedCustomer.name}" and all their entries. This action cannot be undone.
                </Text>
                <Text style={[styles.deleteInstruction, { color: colors.text }]}>
                  Type the customer name to confirm:
                </Text>
                <Text style={[styles.customerNameDisplay, { color: colors.accent }]}>
                  {selectedCustomer.name}
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
                      backgroundColor: deleteConfirmText.trim().toLowerCase() === selectedCustomer.name.trim().toLowerCase() ? colors.error : colors.border,
                      opacity: deleteConfirmText.trim().toLowerCase() === selectedCustomer.name.trim().toLowerCase() ? 1 : 0.5
                    }]}
                    onPress={confirmDelete}
                    disabled={deleteConfirmText.trim().toLowerCase() !== selectedCustomer.name.trim().toLowerCase()}
                  >
                    <Text style={styles.submitBtnText}>DELETE PERMANENTLY</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <BottomNavigation navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  addBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 0.5, marginBottom: 20, gap: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  listCard: { overflow: 'hidden' },
  customerItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  customerNumber: { fontSize: 13 },
  customerRight: { alignItems: 'flex-end', gap: 4 },
  customerBalance: { fontSize: 15, fontWeight: '600', flexShrink: 0, minWidth: 80, textAlign: 'right' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  modalHandle: { width: 36, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  input: { padding: 14, borderRadius: 12, fontSize: 16, marginBottom: 12 },
  submitBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  menuContent: { borderRadius: 12, padding: 8, minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '500' },
  menuDivider: { height: 1, marginVertical: 4 },

  deleteWarning: { fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  deleteInstruction: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  customerNameDisplay: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16, paddingVertical: 8 },
  deleteButtonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelDeleteBtn: { flex: 1, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  cancelDeleteText: { fontSize: 15, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
});
