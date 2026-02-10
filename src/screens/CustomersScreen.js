import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { Storage } from '../utils/Storage';
import KeyboardSpacer from '../components/KeyboardSpacer';
import BottomNavigation from '../components/BottomNavigation';
import GlassCard from '../components/GlassCard';
import OfflineBanner from '../components/OfflineBanner';
import { SkeletonCustomers } from '../components/Skeleton';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_HEIGHT } from '../constants/layout';
import { useFeedback } from '../context/FeedbackContext';
import i18n from '../utils/i18n';

export default function CustomersScreen({ navigation }) {
  const { colors } = useContext(ThemeContext);
  const { formatWithSign, primaryCurrency, walletBalances } = useCurrency();
  const { toast } = useFeedback();
  const insets = useSafeAreaInsets();
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
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);

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
    setLoading(true);
    try {
      const data = await Storage.getCustomers();
      setCustomers(data || []);
      applyFilter(data || [], searchQuery);
      hasLoadedOnce.current = true;
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (data, query) => {
    let filtered = [...data];
    if (query.trim()) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || (c.number || '').includes(query));
    }
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    setFilteredCustomers(filtered);
  };

  useEffect(() => {
    applyFilter(customers, searchQuery);
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  }, []);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({ type: 'warning', title: i18n.t('missingName'), message: i18n.t('missingNameMsg') });
      return;
    }
    if (addSubmitting) return;
    setAddSubmitting(true);
    try {
      const result = await Storage.addCustomer({ name: formData.name.trim(), number: formData.number.trim() });
      if (result) {
        setFormData({ name: '', number: '' });
        setShowAddModal(false);
        await loadCustomers();
        toast({ type: 'success', title: i18n.t('added'), message: i18n.t('customerAdded') });
      } else {
        toast({ type: 'error', title: i18n.t('error'), message: i18n.t('couldNotAddCustomer') });
      }
    } catch (e) {
      console.error('handleAdd:', e);
      toast({ type: 'error', title: i18n.t('error'), message: e?.message || i18n.t('couldNotAddCustomer') });
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!formData.name.trim() || !selectedCustomer) return;
    try {
      const updated = await Storage.updateCustomer(selectedCustomer.id, { name: formData.name.trim(), number: formData.number.trim() });
      if (updated) {
        setFormData({ name: '', number: '' });
        setSelectedCustomer(null);
        setShowEditModal(false);
        await loadCustomers();
        toast({ type: 'success', title: i18n.t('updated'), message: i18n.t('customerUpdated') });
      } else {
        toast({ type: 'error', title: i18n.t('error'), message: i18n.t('couldNotUpdateCustomer') });
      }
    } catch (e) {
      console.error('handleEdit:', e);
      toast({ type: 'error', title: i18n.t('error'), message: e?.message || i18n.t('couldNotUpdateCustomer') });
    }
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
    if (deleteConfirmText.trim().toLowerCase() !== selectedCustomer.name.trim().toLowerCase()) {
      toast({ type: 'error', title: i18n.t('nameDoesNotMatch'), message: i18n.t('typeExactNameToConfirm') });
      return;
    }
    try {
      const ok = await Storage.deleteCustomer(selectedCustomer.id);
      if (ok) {
        setShowDeleteConfirmModal(false);
        setDeleteConfirmText('');
        setSelectedCustomer(null);
        await loadCustomers();
        toast({ type: 'success', title: i18n.t('deleted'), message: i18n.t('customerRemoved') });
      } else {
        toast({ type: 'error', title: i18n.t('error'), message: i18n.t('couldNotDeleteCustomer') });
      }
    } catch (e) {
      console.error('confirmDelete:', e);
      toast({ type: 'error', title: i18n.t('error'), message: e?.message || i18n.t('couldNotDeleteCustomer') });
    }
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <OfflineBanner />
      {loading && !hasLoadedOnce.current ? (
        <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
          <SkeletonCustomers />
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        {/* Header - button outside Animated.View so modal open works on Android */}
        <View style={styles.header}>
          <Animated.View
            style={{
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
              flex: 1,
            }}
          >
            <Text style={[styles.title, { color: colors.text }]}>{i18n.t('customers')}</Text>
          </Animated.View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="add" size={20} color={colors.onAccent} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <Animated.View style={{ opacity: headerAnim }}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={i18n.t('searchPlaceholder')}
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
                {searchQuery ? i18n.t('noResults') : i18n.t('noCustomersYet')}
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
                  <View style={[styles.avatar, { backgroundColor: (colors.avatarColors || [colors.accent])[customer.name.charCodeAt(0) % (colors.avatarColors || [colors.accent]).length] }]}>
                    <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>{customer.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={[styles.customerName, { color: colors.text }]}>{customer.name}</Text>
                    <Text style={[styles.customerNumber, { color: colors.textTertiary }]}>{customer.number || '—'}</Text>
                  </View>
                  <View style={styles.customerRight}>
                    <View style={styles.customerBalances}>
                      {(walletBalances && walletBalances.length > 0)
                        ? (walletBalances || []).map((w) => {
                            const code = (w.currencyCode || '').toUpperCase();
                            const amount = parseFloat((customer.balanceByCurrency && customer.balanceByCurrency[code]) ?? 0);
                            const isPrimary = code === (primaryCurrency || '').toUpperCase();
                            if (!isPrimary && amount === 0) return null;
                            return (
                              <Text key={code} style={[styles.customerBalanceLine, { color: amount < 0 ? colors.error : colors.success }]}>
                                {formatWithSign(amount, code)}
                              </Text>
                            );
                          })
                        : (
                          <Text style={[styles.customerBalanceLine, { color: (parseFloat(customer.balance) || 0) < 0 ? colors.error : colors.success }]}>
                            {formatWithSign(parseFloat(customer.balance) || 0, primaryCurrency)}
                          </Text>
                        )}
                    </View>
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
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={[styles.modalBackdrop, { zIndex: 0 }]} onPress={() => { Keyboard.dismiss(); setShowAddModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background, zIndex: 1 }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('newCustomer')}</Text>
            <ScrollView
              style={{ width: '100%', maxHeight: 280 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={i18n.t('name')}
                placeholderTextColor={colors.textTertiary}
                value={formData.name}
                onChangeText={(t) => setFormData(prev => ({ ...prev, name: t }))}
                returnKeyType="next"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={i18n.t('phoneOptional')}
                placeholderTextColor={colors.textTertiary}
                value={formData.number}
                onChangeText={(t) => setFormData(prev => ({ ...prev, number: t }))}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </ScrollView>
            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.accent }, addSubmitting && { opacity: 0.7 }]}
              onPress={handleAdd}
              disabled={addSubmitting}
            >
              <Text style={[styles.submitBtnText, { color: colors.onAccent }]}>{addSubmitting ? '...' : i18n.t('addCustomer')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Menu Modal */}
      <Modal visible={showMenuModal} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setShowMenuModal(false)}>
        <TouchableOpacity style={styles.menuOverlay} onPress={() => { Keyboard.dismiss(); setShowMenuModal(false); }} activeOpacity={1}>
          <View style={[styles.menuContent, { backgroundColor: colors.background, shadowColor: colors.shadow }]}>
            <TouchableOpacity style={styles.menuItem} onPress={openEdit} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={22} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>{i18n.t('editCustomer')}</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.menuItem} onPress={openDeleteConfirm} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
              <Text style={[styles.menuText, { color: colors.error }]}>{i18n.t('deleteCustomer')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={[styles.modalBackdrop, { zIndex: 0 }]} onPress={() => { Keyboard.dismiss(); setShowEditModal(false); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background, zIndex: 1 }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{i18n.t('editCustomer')}</Text>
            <ScrollView 
              style={{ width: '100%', maxHeight: '85%' }}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={i18n.t('name')}
                placeholderTextColor={colors.textTertiary}
                value={formData.name}
                onChangeText={(t) => setFormData(prev => ({ ...prev, name: t }))}
                returnKeyType="next"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={i18n.t('phone')}
                placeholderTextColor={colors.textTertiary}
                value={formData.number}
                onChangeText={(t) => setFormData(prev => ({ ...prev, number: t }))}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <Pressable style={[styles.submitBtn, { backgroundColor: colors.accent }]} onPress={handleEdit}>
                <Text style={[styles.submitBtnText, { color: colors.onAccent }]}>{i18n.t('save')}</Text>
              </Pressable>
              <KeyboardSpacer />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirmModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowDeleteConfirmModal(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => { Keyboard.dismiss(); setShowDeleteConfirmModal(false); setDeleteConfirmText(''); }} activeOpacity={1} />
          <View style={[styles.modalContent, { backgroundColor: colors.background }]} pointerEvents="auto">
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Ionicons name="warning" size={48} color={colors.error} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={[styles.modalTitle, { color: colors.error }]}>{i18n.t('deleteCustomer')}</Text>
            <ScrollView 
              style={{ width: '100%', maxHeight: '85%' }}
              contentContainerStyle={{ paddingBottom: 80 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
            >
              {selectedCustomer && (
                <>
                  <Text style={[styles.deleteWarning, { color: colors.textSecondary }]}>
                    {i18n.t('deleteCustomerConfirm')}
                  </Text>
                  <Text style={[styles.deleteInstruction, { color: colors.text }]}>
                    {i18n.t('typeExactNameToConfirm')}
                  </Text>
                  <Text style={[styles.customerNameDisplay, { color: colors.accent }]}>
                    {selectedCustomer.name}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderWidth: 1, borderColor: colors.border }]}
                    placeholder={i18n.t('typeCustomerNameHere')}
                    placeholderTextColor={colors.textTertiary}
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <View style={styles.deleteButtonRow}>
                    <TouchableOpacity
                      style={[styles.cancelDeleteBtn, { backgroundColor: colors.backgroundSecondary }]}
                      onPress={() => { setShowDeleteConfirmModal(false); setDeleteConfirmText(''); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.cancelDeleteText, { color: colors.text }]}>{i18n.t('cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmDeleteBtn, { 
                        backgroundColor: deleteConfirmText.trim().toLowerCase() === selectedCustomer.name.trim().toLowerCase() ? colors.error : colors.border,
                        opacity: deleteConfirmText.trim().toLowerCase() === selectedCustomer.name.trim().toLowerCase() ? 1 : 0.5
                      }]}
                      onPress={confirmDelete}
                      disabled={deleteConfirmText.trim().toLowerCase() !== selectedCustomer.name.trim().toLowerCase()}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.submitBtnText, { color: colors.onError }]}>{i18n.t('delete').toUpperCase()}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <KeyboardSpacer />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {!showAddModal && !showEditModal && !showDeleteConfirmModal && !showMenuModal && (
        <BottomNavigation navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  addBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 18, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  listCard: { overflow: 'hidden' },
  customerItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  customerNumber: { fontSize: 13 },
  customerRight: { alignItems: 'flex-end', gap: 4 },
  customerBalances: { alignItems: 'flex-end', gap: 2 },
  customerBalanceLine: { fontSize: 14, fontWeight: '700', flexShrink: 0, textAlign: 'right' },
  customerBalance: { fontSize: 15, fontWeight: '700', flexShrink: 0, minWidth: 80, textAlign: 'right' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, minHeight: 0 },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHandle: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  input: { padding: 14, borderRadius: 12, fontSize: 16, marginBottom: 12 },
  submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '700' },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  menuContent: { borderRadius: 12, padding: 8, minWidth: 180, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '500' },
  menuDivider: { height: 1, marginVertical: 4 },

  deleteWarning: { fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  deleteInstruction: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  customerNameDisplay: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16, paddingVertical: 8 },
  deleteButtonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelDeleteBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  cancelDeleteText: { fontSize: 15, fontWeight: '600' },
  confirmDeleteBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
});
