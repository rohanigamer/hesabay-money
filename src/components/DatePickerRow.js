import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import i18n from '../utils/i18n';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Compact date picker row for transaction forms.
 * Shows selected date with arrow buttons to nudge day-by-day,
 * or tap the date label to open a full month/day/year picker modal.
 */
export default function DatePickerRow({ date, onChange }) {
  const { colors } = useContext(ThemeContext);
  const [showPicker, setShowPicker] = useState(false);

  const current = date ? new Date(date) : new Date();

  const isToday = new Date().toDateString() === current.toDateString();

  const nudge = (days) => {
    const d = new Date(current);
    d.setDate(d.getDate() + days);
    if (d > new Date()) return; // Don't allow future dates
    onChange(d.toISOString());
  };

  const setToToday = () => {
    onChange(new Date().toISOString());
  };

  const label = isToday
    ? i18n.t('today') || 'Today'
    : current.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <View style={[styles.row, { backgroundColor: colors.backgroundSecondary, borderRadius: 12 }]}>  
        <TouchableOpacity onPress={() => nudge(-1)} style={styles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateLabel}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.6}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.dateLabelText, { color: isToday ? colors.accent : colors.text }]}>{label}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => nudge(1)}
          style={styles.arrowBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={isToday}
        >
          <Ionicons name="chevron-forward" size={20} color={isToday ? colors.border : colors.textSecondary} />
        </TouchableOpacity>

        {!isToday && (
          <TouchableOpacity onPress={setToToday} style={[styles.todayBtn, { backgroundColor: colors.accentLight }]}>
            <Text style={[styles.todayBtnText, { color: colors.accent }]}>{i18n.t('today') || 'Today'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FullDatePickerModal
        visible={showPicker}
        date={current}
        onSelect={(d) => { onChange(d.toISOString()); setShowPicker(false); }}
        onClose={() => setShowPicker(false)}
        colors={colors}
      />
    </>
  );
}

function FullDatePickerModal({ visible, date, onSelect, onClose, colors }) {
  const [year, setYear] = useState(date.getFullYear());
  const [month, setMonth] = useState(date.getMonth());
  const [day, setDay] = useState(date.getDate());

  const now = new Date();
  const maxYear = now.getFullYear();

  // Reset state when opened
  React.useEffect(() => {
    if (visible) {
      setYear(date.getFullYear());
      setMonth(date.getMonth());
      setDay(date.getDate());
    }
  }, [visible]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const effectiveDay = Math.min(day, daysInMonth);

  const handleConfirm = () => {
    const selected = new Date(year, month, effectiveDay, 12, 0, 0);
    if (selected > now) {
      onSelect(now);
    } else {
      onSelect(selected);
    }
  };

  const years = [];
  for (let y = maxYear; y >= maxYear - 10; y--) years.push(y);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={dpStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[dpStyles.content, { backgroundColor: colors.background }]}>
          <View style={[dpStyles.handle, { backgroundColor: colors.border }]} />
          <Text style={[dpStyles.title, { color: colors.text }]}>{i18n.t('selectDate') || 'Select Date'}</Text>

          <View style={dpStyles.columnsRow}>
            {/* Month */}
            <View style={dpStyles.column}>
              <Text style={[dpStyles.colLabel, { color: colors.textSecondary }]}>{i18n.t('month') || 'Month'}</Text>
              <ScrollView style={dpStyles.scrollCol} showsVerticalScrollIndicator={false}>
                {MONTHS.map((m, i) => (
                  <TouchableOpacity
                    key={m}
                    style={[dpStyles.cell, month === i && { backgroundColor: colors.accentLight }]}
                    onPress={() => setMonth(i)}
                  >
                    <Text style={[dpStyles.cellText, { color: month === i ? colors.accent : colors.text }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day */}
            <View style={dpStyles.column}>
              <Text style={[dpStyles.colLabel, { color: colors.textSecondary }]}>{i18n.t('day') || 'Day'}</Text>
              <ScrollView style={dpStyles.scrollCol} showsVerticalScrollIndicator={false}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[dpStyles.cell, effectiveDay === d && { backgroundColor: colors.accentLight }]}
                    onPress={() => setDay(d)}
                  >
                    <Text style={[dpStyles.cellText, { color: effectiveDay === d ? colors.accent : colors.text }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Year */}
            <View style={dpStyles.column}>
              <Text style={[dpStyles.colLabel, { color: colors.textSecondary }]}>{i18n.t('year') || 'Year'}</Text>
              <ScrollView style={dpStyles.scrollCol} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[dpStyles.cell, year === y && { backgroundColor: colors.accentLight }]}
                    onPress={() => setYear(y)}
                  >
                    <Text style={[dpStyles.cellText, { color: year === y ? colors.accent : colors.text }]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity
            style={[dpStyles.confirmBtn, { backgroundColor: colors.accent }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={[dpStyles.confirmBtnText, { color: colors.onAccent }]}>{i18n.t('confirm') || 'Confirm'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  arrowBtn: {
    padding: 8,
  },
  dateLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dateLabelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 4,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

const dpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  column: {
    flex: 1,
  },
  colLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollCol: {
    maxHeight: 200,
    borderRadius: 12,
  },
  cell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 2,
  },
  cellText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
