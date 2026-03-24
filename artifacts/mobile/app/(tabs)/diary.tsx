import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, AttendanceRecord } from '@/context/AppContext';

type CellStatus = 'present' | 'absent' | 'justified';

function getLast30Days() {
  const days: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDayLabel(dateStr: string) {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

function formatDayOfWeek(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
}

function formatFullDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

type EditTarget = { studentId: string; studentName: string; date: string; status: CellStatus } | null;

export default function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const { students, attendance, toggleAttendance, setAttendanceRecord, justifyAbsence } = useApp();

  const allDays = useMemo(() => getLast30Days(), []);
  const [filterDate, setFilterDate] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterInput, setFilterInput] = useState('');
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [justifyText, setJustifyText] = useState('');
  const [justifyMode, setJustifyMode] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const days = useMemo(() => {
    if (!filterDate) return allDays;
    if (allDays.includes(filterDate)) return [filterDate];
    return [filterDate];
  }, [allDays, filterDate]);

  const getRecord = (studentId: string, date: string): AttendanceRecord | undefined =>
    attendance.find(a => a.studentId === studentId && a.date === date);

  const getCellStatus = (studentId: string, date: string): CellStatus => {
    const rec = getRecord(studentId, date);
    if (!rec) return 'present';
    if (!rec.present && rec.justified) return 'justified';
    return rec.present ? 'present' : 'absent';
  };

  const getAbsentCount = (studentId: string) =>
    allDays.filter(d => getCellStatus(studentId, d) === 'absent').length;

  const getJustifiedCount = (studentId: string) =>
    allDays.filter(d => getCellStatus(studentId, d) === 'justified').length;

  const handleCellPress = (studentId: string, studentName: string, date: string) => {
    const status = getCellStatus(studentId, date);
    const rec = getRecord(studentId, date);
    setEditTarget({ studentId, studentName, date, status });
    if (status === 'justified') {
      setJustifyMode(true);
      setJustifyText(rec?.justification ?? '');
    } else {
      setJustifyMode(false);
      setJustifyText('');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSetPresent = async () => {
    if (!editTarget) return;
    await setAttendanceRecord(editTarget.studentId, editTarget.date, true);
    setEditTarget(null);
  };

  const handleSetAbsent = async () => {
    if (!editTarget) return;
    await setAttendanceRecord(editTarget.studentId, editTarget.date, false);
    setEditTarget(null);
  };

  const handleJustify = async () => {
    if (!editTarget || !justifyText.trim()) return;
    await justifyAbsence(editTarget.studentId, editTarget.date, justifyText.trim());
    setEditTarget(null);
    setJustifyText('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const applyFilter = () => {
    const parts = filterInput.replace(/\//g, '-').split('-');
    if (parts.length === 3) {
      let y = parts[0], m = parts[1], d = parts[2];
      if (parts[0].length === 2) { y = parts[2]; m = parts[1]; d = parts[0]; }
      const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      setFilterDate(iso);
    }
    setShowFilterModal(false);
  };

  const clearFilter = () => {
    setFilterDate('');
    setFilterInput('');
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Diário</Text>
          <Text style={styles.headerSub}>
            {filterDate ? formatFullDate(filterDate) : 'Últimos 30 dias'}
          </Text>
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)} activeOpacity={0.8}>
          <Feather name="filter" size={18} color={filterDate ? Colors.primary : Colors.textSecondary} />
        </TouchableOpacity>
        {filterDate ? (
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilter} activeOpacity={0.8}>
            <Ionicons name="close" size={18} color={Colors.danger} />
          </TouchableOpacity>
        ) : null}
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum aluno cadastrado</Text>
          <Text style={styles.emptySubtitle}>Adicione alunos na aba Chamada</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableWrapper}>
          <View>
            <View style={styles.headerRow}>
              <View style={styles.nameColumn}>
                <Text style={styles.columnLabel}>Aluno</Text>
              </View>
              {days.map(day => (
                <View key={day} style={styles.dayColumn}>
                  <Text style={styles.dayOfWeek}>{formatDayOfWeek(day)}</Text>
                  <Text style={styles.dayLabel}>{formatDayLabel(day)}</Text>
                </View>
              ))}
              <View style={styles.totalColumn}>
                <Text style={styles.columnLabel}>F</Text>
              </View>
              <View style={styles.totalColumn}>
                <Text style={[styles.columnLabel, { color: Colors.warning }]}>FJ</Text>
              </View>
            </View>
            <ScrollView
              style={styles.bodyScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPadding + 100 }}
            >
              {students.map((student, index) => (
                <View
                  key={student.id}
                  style={[styles.studentRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}
                >
                  <View style={styles.nameColumn}>
                    <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                  </View>
                  {days.map(day => {
                    const status = getCellStatus(student.id, day);
                    return (
                      <View key={day} style={styles.dayColumn}>
                        <TouchableOpacity
                          onPress={() => handleCellPress(student.id, student.name, day)}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.cell,
                            status === 'present' ? styles.cellPresent
                              : status === 'justified' ? styles.cellJustified
                                : styles.cellAbsent,
                          ]}>
                            {status === 'present' ? (
                              <Ionicons name="checkmark" size={13} color={Colors.success} />
                            ) : status === 'justified' ? (
                              <Ionicons name="alert" size={13} color={Colors.warning} />
                            ) : (
                              <Ionicons name="close" size={13} color={Colors.danger} />
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  <View style={styles.totalColumn}>
                    <View style={[styles.totalBadge, getAbsentCount(student.id) > 0 ? styles.totalBadgeDanger : styles.totalBadgeOk]}>
                      <Text style={[styles.totalText, getAbsentCount(student.id) > 0 ? styles.totalTextDanger : styles.totalTextOk]}>
                        {getAbsentCount(student.id)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.totalColumn}>
                    <View style={[styles.totalBadge, getJustifiedCount(student.id) > 0 ? styles.totalBadgeWarning : styles.totalBadgeOk]}>
                      <Text style={[styles.totalText, getJustifiedCount(student.id) > 0 ? styles.totalTextWarning : styles.totalTextOk]}>
                        {getJustifiedCount(student.id)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Legend */}
      {students.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="checkmark" size={10} color={Colors.success} />
            </View>
            <Text style={styles.legendText}>Presente</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="close" size={10} color={Colors.danger} />
            </View>
            <Text style={styles.legendText}>Falta</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="alert" size={10} color={Colors.warning} />
            </View>
            <Text style={styles.legendText}>Justificada</Text>
          </View>
        </View>
      )}

      {/* Edit Cell Modal */}
      <Modal visible={!!editTarget} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setEditTarget(null); setJustifyMode(false); }}>
          <View style={[styles.editCard, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.editTitle}>{editTarget?.studentName}</Text>
            <Text style={styles.editDate}>{editTarget ? formatFullDate(editTarget.date) : ''}</Text>

            {!justifyMode ? (
              <>
                <TouchableOpacity style={[styles.editOption, styles.editPresent]} onPress={handleSetPresent} activeOpacity={0.85}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <Text style={[styles.editOptionText, { color: Colors.success }]}>Marcar Presente</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.editOption, styles.editAbsent]} onPress={handleSetAbsent} activeOpacity={0.85}>
                  <Ionicons name="close-circle" size={20} color={Colors.danger} />
                  <Text style={[styles.editOptionText, { color: Colors.danger }]}>Marcar Falta</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editOption, styles.editJustify]}
                  onPress={() => {
                    const rec = getRecord(editTarget!.studentId, editTarget!.date);
                    setJustifyText(rec?.justification ?? '');
                    setJustifyMode(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-text-outline" size={20} color={Colors.warning} />
                  <Text style={[styles.editOptionText, { color: Colors.warning }]}>
                    {editTarget?.status === 'justified' ? 'Editar justificativa' : 'Justificar Falta'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.justifyLabel}>
                  {editTarget?.status === 'justified' ? 'Editar justificativa' : 'Motivo da justificativa'}
                </Text>
                <ScrollView style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled">
                  <TextInput
                    style={[styles.justifyInput, { minHeight: 88 }]}
                    placeholder="Descreva o motivo..."
                    placeholderTextColor={Colors.textTertiary}
                    value={justifyText}
                    onChangeText={setJustifyText}
                    multiline
                    autoFocus
                  />
                </ScrollView>
                <View style={styles.justifyButtons}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setJustifyMode(false)} activeOpacity={0.8}>
                    <Text style={styles.modalCancelText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, !justifyText.trim() && styles.btnDisabled]}
                    onPress={handleJustify}
                    activeOpacity={0.85}
                    disabled={!justifyText.trim()}
                  >
                    <Text style={styles.modalConfirmText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.editCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.editTitle}>Filtrar por data</Text>
            <Text style={styles.editDate}>Formato: DD/MM/AAAA</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="Ex: 15/03/2026"
              placeholderTextColor={Colors.textTertiary}
              value={filterInput}
              onChangeText={setFilterInput}
              keyboardType="numbers-and-punctuation"
              autoFocus
            />
            <View style={styles.justifyButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowFilterModal(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !filterInput.trim() && styles.btnDisabled]}
                onPress={applyFilter}
                activeOpacity={0.85}
                disabled={!filterInput.trim()}
              >
                <Text style={styles.modalConfirmText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableWrapper: { paddingHorizontal: 0 },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
  },
  bodyScroll: { flex: 1 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowEven: { backgroundColor: Colors.surface },
  rowOdd: { backgroundColor: Colors.background },
  nameColumn: { width: 130, paddingHorizontal: 12, justifyContent: 'center' },
  dayColumn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  totalColumn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  columnLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayOfWeek: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  dayLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  studentName: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.text },
  cell: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cellPresent: { backgroundColor: Colors.successLight },
  cellAbsent: { backgroundColor: Colors.dangerLight },
  cellJustified: { backgroundColor: Colors.warningLight },
  totalBadge: { width: 28, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  totalBadgeDanger: { backgroundColor: Colors.dangerLight },
  totalBadgeWarning: { backgroundColor: Colors.warningLight },
  totalBadgeOk: { backgroundColor: Colors.successLight },
  totalText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  totalTextDanger: { color: Colors.danger },
  totalTextWarning: { color: Colors.warning },
  totalTextOk: { color: Colors.success },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  legendText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  editCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 8,
  },
  editTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.text },
  editDate: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: -4 },
  editOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  editPresent: { backgroundColor: Colors.successLight, borderColor: '#A8E6B8' },
  editAbsent: { backgroundColor: Colors.dangerLight, borderColor: '#FFD5D3' },
  editJustify: { backgroundColor: Colors.warningLight, borderColor: '#FFD9A0' },
  editOptionText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  justifyLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  justifyInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    minHeight: 88,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    textAlignVertical: 'top',
  },
  filterInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  justifyButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, height: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: Colors.surfaceSecondary,
  },
  modalCancelText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  modalConfirmBtn: {
    flex: 1, height: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: Colors.primary,
  },
  modalConfirmText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
});
