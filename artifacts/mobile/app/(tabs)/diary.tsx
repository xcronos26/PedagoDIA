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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { DataLoadingWrapper } from '@/components/DataLoadingWrapper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, AttendanceRecord } from '@/context/AppContext';
import { ClassPicker } from '@/components/ClassPicker';
import {
  getWeekDays,
  getBrasiliaToday,
  getBrasiliaDate,
  parseISODate,
  toISO,
  formatBR,
  formatDayLabel,
  formatDayOfWeek,
} from '@/utils/date';

type CellStatus = 'present' | 'absent' | 'justified';
type EditTarget = { studentId: string; studentName: string; date: string; status: CellStatus } | null;

export default function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const { students, classes, selectedClassId, setSelectedClassId, attendance, setAttendanceRecord, justifyAbsence, getAttendanceForDate, isLoaded, loadError, loadData } = useApp();

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return students;
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  const [weekOffset, setWeekOffset] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [justifyText, setJustifyText] = useState('');
  const [justifyMode, setJustifyMode] = useState(false);
  const [saving, setSaving] = useState<'present' | 'absent' | 'justify' | null>(null);

  const today = getBrasiliaToday();
  const days = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekStart = days[0];
  const weekEnd = days[4];

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const getRecord = (studentId: string, date: string): AttendanceRecord | undefined =>
    attendance.find(a => a.studentId === studentId && a.date === date);

  const getCellStatus = (studentId: string, date: string): CellStatus => {
    const rec = getRecord(studentId, date);
    if (!rec) return 'present';
    if (!rec.present && rec.justified) return 'justified';
    return rec.present ? 'present' : 'absent';
  };

  // Totals count over ALL attendance records (all weeks)
  const getAbsentCount = (studentId: string) =>
    attendance.filter(a => a.studentId === studentId && !a.present && !a.justified).length;

  const getJustifiedCount = (studentId: string) =>
    attendance.filter(a => a.studentId === studentId && a.justified).length;

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
    if (!editTarget || saving) return;
    setSaving('present');
    try {
      await setAttendanceRecord(editTarget.studentId, editTarget.date, true);
      setEditTarget(null);
    } finally {
      setSaving(null);
    }
  };

  const handleSetAbsent = async () => {
    if (!editTarget || saving) return;
    setSaving('absent');
    try {
      await setAttendanceRecord(editTarget.studentId, editTarget.date, false);
      setEditTarget(null);
    } finally {
      setSaving(null);
    }
  };

  const handleJustify = async () => {
    if (!editTarget || !justifyText.trim() || saving) return;
    setSaving('justify');
    try {
      await justifyAbsence(editTarget.studentId, editTarget.date, justifyText.trim());
      setEditTarget(null);
      setJustifyText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(null);
    }
  };

  const handleDatePickerChange = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const iso = toISO(date);
      // Find which week contains this date and navigate to it
      const todayDate = getBrasiliaDate();
      const todayDow = todayDate.getDay();
      const mondayDelta = todayDow === 0 ? -6 : 1 - todayDow;
      const thisMondayMs = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + mondayDelta).getTime();
      const selectedMondayDow = date.getDay();
      const selectedMondayDelta = selectedMondayDow === 0 ? -6 : 1 - selectedMondayDow;
      const selectedMondayMs = new Date(date.getFullYear(), date.getMonth(), date.getDate() + selectedMondayDelta).getTime();
      const diffWeeks = Math.round((selectedMondayMs - thisMondayMs) / (7 * 24 * 60 * 60 * 1000));
      setWeekOffset(diffWeeks);
    }
  };

  const isCurrentWeek = weekOffset === 0;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Diário</Text>
          <Text style={styles.headerSub}>
            {formatDayLabel(weekStart)} – {formatDayLabel(weekEnd)}
            {isCurrentWeek ? '  (esta semana)' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={() => setWeekOffset(o => o - 1)} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, isCurrentWeek && styles.navBtnDisabled]}
          onPress={() => setWeekOffset(o => o + 1)}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-forward" size={20} color={isCurrentWeek ? Colors.textTertiary : Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
        {weekOffset !== 0 && (
          <TouchableOpacity style={styles.todayBtn} onPress={() => setWeekOffset(0)} activeOpacity={0.8}>
            <Text style={styles.todayBtnText}>Hoje</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Picker (shown on demand) */}
      {showDatePicker && (
        <DateTimePicker
          value={parseISODate(days[0])}
          mode="date"
          display="default"
          onChange={handleDatePickerChange}
          maximumDate={parseISODate(today)}
          locale="pt-BR"
        />
      )}

      <ClassPicker
        classes={classes}
        selectedClassId={selectedClassId}
        onSelect={setSelectedClassId}
      />

      <DataLoadingWrapper isLoaded={isLoaded} loadError={loadError} onRetry={loadData}>
      {filteredStudents.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>
            {selectedClassId ? 'Nenhum aluno nesta turma' : 'Nenhum aluno cadastrado'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {selectedClassId ? 'Adicione alunos a esta turma' : 'Adicione alunos na aba Chamada'}
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableWrapper}>
          <View>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={styles.nameColumn}>
                <Text style={styles.columnLabel}>Aluno</Text>
              </View>
              {days.map(day => {
                const isToday = day === today;
                return (
                  <View key={day} style={[styles.dayColumn, isToday && styles.todayColumn]}>
                    <Text style={[styles.dayOfWeek, isToday && styles.todayDayOfWeek]}>{formatDayOfWeek(day)}</Text>
                    <Text style={[styles.dayLabel, isToday && styles.todayDayLabel]}>{formatDayLabel(day)}</Text>
                  </View>
                );
              })}
              <View style={styles.totalColumn}>
                <Text style={[styles.columnLabel, { color: Colors.danger }]}>F</Text>
              </View>
              <View style={styles.totalColumn}>
                <Text style={[styles.columnLabel, { color: Colors.warning }]}>FJ</Text>
              </View>
            </View>

            {/* Student rows */}
            <ScrollView
              style={styles.bodyScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomPadding + 100 }}
            >
              {filteredStudents.map((student, index) => (
                <View
                  key={student.id}
                  style={[styles.studentRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}
                >
                  <View style={styles.nameColumn}>
                    <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                  </View>
                  {days.map(day => {
                    const status = getCellStatus(student.id, day);
                    const isToday = day === today;
                    return (
                      <View key={day} style={[styles.dayColumn, isToday && styles.todayColumn]}>
                        <TouchableOpacity onPress={() => handleCellPress(student.id, student.name, day)} activeOpacity={0.7}>
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

      </DataLoadingWrapper>

      {/* Legend */}
      {filteredStudents.length > 0 && isLoaded && !loadError && (
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
          <View style={styles.legendItem}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
            <Text style={[styles.legendText, { color: Colors.textTertiary }]}>F/FJ = total geral</Text>
          </View>
        </View>
      )}

      {/* Edit Cell Modal */}
      <Modal visible={!!editTarget} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setEditTarget(null); setJustifyMode(false); }}>
            <View style={[styles.editCard, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.editTitle}>{editTarget?.studentName}</Text>
              <Text style={styles.editDate}>{editTarget ? formatBR(editTarget.date) : ''}</Text>

              {!justifyMode ? (
                <>
                  <TouchableOpacity
                    style={[styles.editOption, styles.editPresent, saving && styles.optionDisabled]}
                    onPress={handleSetPresent}
                    activeOpacity={0.85}
                    disabled={!!saving}
                  >
                    {saving === 'present'
                      ? <ActivityIndicator size="small" color={Colors.success} />
                      : <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    }
                    <Text style={[styles.editOptionText, { color: Colors.success }]}>Marcar Presente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editOption, styles.editAbsent, saving && styles.optionDisabled]}
                    onPress={handleSetAbsent}
                    activeOpacity={0.85}
                    disabled={!!saving}
                  >
                    {saving === 'absent'
                      ? <ActivityIndicator size="small" color={Colors.danger} />
                      : <Ionicons name="close-circle" size={20} color={Colors.danger} />
                    }
                    <Text style={[styles.editOptionText, { color: Colors.danger }]}>Marcar Falta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editOption, styles.editJustify, saving && styles.optionDisabled]}
                    onPress={() => {
                      const rec = getRecord(editTarget!.studentId, editTarget!.date);
                      setJustifyText(rec?.justification ?? '');
                      setJustifyMode(true);
                    }}
                    activeOpacity={0.85}
                    disabled={!!saving}
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
                    <TouchableOpacity
                      style={[styles.modalCancelBtn, saving === 'justify' && styles.btnDisabled]}
                      onPress={() => setJustifyMode(false)}
                      activeOpacity={0.8}
                      disabled={saving === 'justify'}
                    >
                      <Text style={styles.modalCancelText}>Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalConfirmBtn, (!justifyText.trim() || saving === 'justify') && styles.btnDisabled]}
                      onPress={handleJustify}
                      activeOpacity={0.85}
                      disabled={!justifyText.trim() || saving === 'justify'}
                    >
                      {saving === 'justify'
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.modalConfirmText}>Salvar</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.35 },
  calendarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  todayBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  todayBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#fff' },
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
  dayColumn: { width: 50, alignItems: 'center', justifyContent: 'center' },
  todayColumn: { backgroundColor: Colors.primaryLight + '40' },
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
  todayDayOfWeek: { color: Colors.primary },
  dayLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  todayDayLabel: { color: Colors.primary },
  studentName: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.text },
  cell: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
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
    gap: 12,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  legendText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1.5,
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
  optionDisabled: { opacity: 0.6 },
});
