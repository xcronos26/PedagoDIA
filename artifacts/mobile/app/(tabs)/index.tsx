import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useApp, Student } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { DataLoadingWrapper } from '@/components/DataLoadingWrapper';
import { ClassPicker, NO_CLASS_FILTER } from '@/components/ClassPicker';

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

type StudentAction = { student: Student; mode: 'options' | 'edit' | 'moveClass' } | null;

function StudentCard({ student, isAbsent, onToggle, onLongPress, className, classColor }: {
  student: Student;
  isAbsent: boolean;
  onToggle: () => void;
  onLongPress: () => void;
  className?: string | null;
  classColor?: string | null;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, {}, () => { scale.value = withSpring(1); });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.studentCard, isAbsent ? styles.studentCardAbsent : styles.studentCardPresent]}
        onPress={handlePress}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress();
        }}
        activeOpacity={0.8}
        delayLongPress={400}
      >
        <View style={[styles.statusIndicator, isAbsent ? styles.statusAbsent : styles.statusPresent]}>
          {isAbsent ? (
            <Ionicons name="close" size={18} color={Colors.danger} />
          ) : (
            <Ionicons name="checkmark" size={18} color={Colors.success} />
          )}
        </View>
        <View style={styles.studentNameContainer}>
          <Text style={[styles.studentName, isAbsent && styles.studentNameAbsent]} numberOfLines={1}>
            {student.name}
          </Text>
          {className ? (
            <View style={[styles.classBadge, classColor ? { backgroundColor: classColor + '25' } : undefined]}>
              <Text style={[styles.classBadgeText, classColor ? { color: classColor } : undefined]} numberOfLines={1}>{className}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.statusBadge, isAbsent ? styles.badgeAbsent : styles.badgePresent]}>
          <Text style={[styles.statusText, isAbsent ? styles.statusTextAbsent : styles.statusTextPresent]}>
            {isAbsent ? 'Falta' : 'Presente'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editIcon}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLongPress();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Feather name="more-vertical" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const {
    students, classes, selectedClassId, setSelectedClassId,
    addStudent, removeStudent, editStudent, moveStudentToClass, toggleAttendance, getAttendanceForDate,
    isLoaded, loadError, loadData,
  } = useApp();
  const { teacher, logout } = useAuth();
  const [selectedDate] = useState(formatDate(new Date()));
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClassId, setNewStudentClassId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [studentAction, setStudentAction] = useState<StudentAction>(null);
  const [editName, setEditName] = useState('');
  const [editClassId, setEditClassId] = useState<string | null>(null);

  const hasUnclassifiedStudents = useMemo(() => students.some(s => s.classId === null), [students]);
  const noClassCount = useMemo(() => students.filter(s => s.classId === null).length, [students]);

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return students;
    if (selectedClassId === NO_CLASS_FILTER) return students.filter(s => s.classId === null);
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  const dateAttendance = getAttendanceForDate(selectedDate);
  const isAbsent = (studentId: string) => {
    const record = dateAttendance.find(a => a.studentId === studentId);
    return record ? !record.present : false;
  };
  const absentCount = filteredStudents.filter(s => isAbsent(s.id)).length;
  const presentCount = filteredStudents.length - absentCount;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return;
    setAdding(true);
    const effectiveClassId = selectedClassId === NO_CLASS_FILTER ? null : selectedClassId;
    await addStudent(newStudentName, newStudentClassId ?? effectiveClassId);
    setNewStudentName('');
    setNewStudentClassId(null);
    setAdding(false);
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const openOptions = (student: Student) => {
    setStudentAction({ student, mode: 'options' });
  };

  const openEdit = () => {
    if (!studentAction) return;
    setEditName(studentAction.student.name);
    setEditClassId(studentAction.student.classId);
    setStudentAction({ student: studentAction.student, mode: 'edit' });
  };

  const openMoveClass = () => {
    if (!studentAction) return;
    setStudentAction({ student: studentAction.student, mode: 'moveClass' });
  };

  const handleMoveClass = async (classId: string | null) => {
    if (!studentAction) return;
    await moveStudentToClass(studentAction.student.id, classId);
    setStudentAction(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveEdit = async () => {
    if (!studentAction || !editName.trim()) return;
    const originalClassId = studentAction.student.classId;
    const classIdChanged = editClassId !== originalClassId;
    await editStudent(studentAction.student.id, editName, classIdChanged ? editClassId : undefined);
    setStudentAction(null);
    setEditName('');
    setEditClassId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = async () => {
    if (!studentAction) return;
    await removeStudent(studentAction.student.id);
    setStudentAction(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Chamada</Text>
          <Text style={styles.headerDate}>{formatDateDisplay(selectedDate)}</Text>
          {teacher && <Text style={styles.headerTeacher} numberOfLines={1}>{teacher.name}</Text>}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              await logout();
              router.replace('/(auth)/login');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ClassPicker
        classes={classes}
        selectedClassId={selectedClassId}
        onSelect={setSelectedClassId}
        showNoClass={hasUnclassifiedStudents || selectedClassId === NO_CLASS_FILTER}
        noClassCount={noClassCount}
      />

      <DataLoadingWrapper isLoaded={isLoaded} loadError={loadError} onRetry={loadData}>
      {filteredStudents.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statBadge, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={[styles.statText, { color: Colors.success }]}>{presentCount} presentes</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: Colors.dangerLight }]}>
            <Ionicons name="close-circle" size={16} color={Colors.danger} />
            <Text style={[styles.statText, { color: Colors.danger }]}>{absentCount} faltas</Text>
          </View>
        </View>
      )}

      {filteredStudents.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>
            {selectedClassId === NO_CLASS_FILTER ? 'Nenhum aluno sem turma' : selectedClassId ? 'Nenhum aluno nesta turma' : 'Nenhum aluno cadastrado'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {selectedClassId === NO_CLASS_FILTER ? 'Todos os alunos já têm turma' : selectedClassId ? 'Adicione alunos a esta turma' : 'Toque no + para adicionar alunos'}
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Adicionar aluno</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <StudentCard
              student={item}
              isAbsent={isAbsent(item.id)}
              onToggle={() => toggleAttendance(item.id, selectedDate)}
              onLongPress={() => openOptions(item)}
              className={!selectedClassId ? classes.find(c => c.id === item.classId)?.name ?? null : null}
              classColor={!selectedClassId ? classes.find(c => c.id === item.classId)?.color ?? null : null}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      </DataLoadingWrapper>

      {/* Add Student Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Adicionar aluno</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome do aluno"
              placeholderTextColor={Colors.textTertiary}
              value={newStudentName}
              onChangeText={setNewStudentName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddStudent}
              autoCapitalize="words"
            />
            {classes.length > 0 && (
              <View>
                <Text style={styles.classLabel}>Turma (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classChips}>
                  <TouchableOpacity
                    style={[styles.classChip, !newStudentClassId && styles.classChipActive]}
                    onPress={() => setNewStudentClassId(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.classChipText, !newStudentClassId && styles.classChipTextActive]}>
                      Sem turma
                    </Text>
                  </TouchableOpacity>
                  {classes.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.classChip, newStudentClassId === c.id && styles.classChipActive]}
                      onPress={() => setNewStudentClassId(c.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.classChipText, newStudentClassId === c.id && styles.classChipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowAddModal(false); setNewStudentName(''); setNewStudentClassId(null); }} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !newStudentName.trim() && styles.btnDisabled]}
                onPress={handleAddStudent}
                activeOpacity={0.85}
                disabled={!newStudentName.trim() || adding}
              >
                <Text style={styles.modalConfirmText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Student Options / Edit Modal */}
      <Modal visible={!!studentAction} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStudentAction(null)}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />

            {studentAction?.mode === 'options' ? (
              <>
                <Text style={styles.modalTitle}>{studentAction?.student.name}</Text>
                <TouchableOpacity style={[styles.optionRow, styles.optionEdit]} onPress={openEdit} activeOpacity={0.85}>
                  <Feather name="edit-2" size={20} color={Colors.primary} />
                  <Text style={[styles.optionText, { color: Colors.primary }]}>Editar nome</Text>
                </TouchableOpacity>
                {classes.length > 0 && (
                  <TouchableOpacity style={[styles.optionRow, { backgroundColor: Colors.primaryLight, borderColor: Colors.primary + '22' }]} onPress={openMoveClass} activeOpacity={0.85}>
                    <Ionicons name="people-outline" size={20} color={Colors.primary} />
                    <Text style={[styles.optionText, { color: Colors.primary }]}>Mudar turma</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.optionRow, styles.optionDelete]} onPress={handleDelete} activeOpacity={0.85}>
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  <Text style={[styles.optionText, { color: Colors.danger }]}>Remover aluno</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setStudentAction(null)} activeOpacity={0.8}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : studentAction?.mode === 'moveClass' ? (
              <>
                <Text style={styles.modalTitle}>Mudar turma</Text>
                <Text style={[styles.modalSubtitle, { marginBottom: 12 }]}>
                  {studentAction.student.name}
                </Text>
                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[
                      styles.classOptionRow,
                      !studentAction.student.classId && styles.classOptionSelected,
                    ]}
                    onPress={() => handleMoveClass(null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={!studentAction.student.classId ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={!studentAction.student.classId ? Colors.primary : Colors.textTertiary}
                    />
                    <Text style={[styles.classOptionText, !studentAction.student.classId && { color: Colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                      Sem turma
                    </Text>
                  </TouchableOpacity>
                  {classes.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.classOptionRow,
                        studentAction.student.classId === c.id && styles.classOptionSelected,
                      ]}
                      onPress={() => handleMoveClass(c.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={studentAction.student.classId === c.id ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={studentAction.student.classId === c.id ? Colors.primary : Colors.textTertiary}
                      />
                      <Text style={[styles.classOptionText, studentAction.student.classId === c.id && { color: Colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[styles.modalCancelBtn, { marginTop: 8 }]} onPress={() => setStudentAction(null)} activeOpacity={0.8}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Editar aluno</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Nome do aluno"
                  placeholderTextColor={Colors.textTertiary}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveEdit}
                  autoCapitalize="words"
                />
                {classes.length > 0 && (
                  <View>
                    <Text style={styles.classLabel}>Turma</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classChips}>
                      <TouchableOpacity
                        style={[styles.classChip, !editClassId && styles.classChipActive]}
                        onPress={() => setEditClassId(null)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.classChipText, !editClassId && styles.classChipTextActive]}>
                          Sem turma
                        </Text>
                      </TouchableOpacity>
                      {classes.map(c => (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.classChip, editClassId === c.id && styles.classChipActive]}
                          onPress={() => setEditClassId(c.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.classChipText, editClassId === c.id && styles.classChipTextActive]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setStudentAction(null)} activeOpacity={0.8}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, !editName.trim() && styles.btnDisabled]}
                    onPress={handleSaveEdit}
                    activeOpacity={0.85}
                    disabled={!editName.trim()}
                  >
                    <Text style={styles.modalConfirmText}>Salvar</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerLeft: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.text, letterSpacing: -0.5 },
  headerDate: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  headerTeacher: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textTertiary, marginTop: 1 },
  logoutButton: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  addButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 8, marginTop: 8 },
  statBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  list: { paddingHorizontal: 16, gap: 8, paddingTop: 4 },
  studentCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 2, gap: 12,
  },
  studentCardPresent: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  studentCardAbsent: { backgroundColor: Colors.dangerLight, borderWidth: 1.5, borderColor: '#FFD5D3' },
  statusIndicator: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusPresent: { backgroundColor: Colors.successLight },
  statusAbsent: { backgroundColor: '#FFD5D3' },
  studentNameContainer: { flex: 1, justifyContent: 'center' },
  studentName: { fontSize: 17, fontFamily: 'Inter_500Medium', color: Colors.text },
  studentNameAbsent: { color: Colors.danger },
  classBadge: {
    alignSelf: 'flex-start', marginTop: 3,
    backgroundColor: Colors.surfaceSecondary, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  classBadgeText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgePresent: { backgroundColor: Colors.successLight },
  badgeAbsent: { backgroundColor: '#FFD5D3' },
  statusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  statusTextPresent: { color: Colors.success },
  statusTextAbsent: { color: Colors.danger },
  editIcon: { padding: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },
  emptyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  emptyButtonText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text },
  modalInput: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: 12, height: 52,
    paddingHorizontal: 16, fontSize: 16, fontFamily: 'Inter_400Regular', color: Colors.text,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  classLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, marginBottom: 8 },
  classChips: { flexDirection: 'row', gap: 8 },
  classChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.border,
  },
  classChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  classChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  classChipTextActive: { color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, height: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: Colors.surfaceSecondary,
  },
  modalCancelText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  modalConfirmBtn: {
    flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  modalConfirmText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1.5,
  },
  optionEdit: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary + '60' },
  optionDelete: { backgroundColor: Colors.dangerLight, borderColor: '#FFD5D3' },
  optionText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  modalSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  classOptionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 6, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  classOptionSelected: {
    backgroundColor: Colors.primaryLight, borderColor: Colors.primary + '60',
  },
  classOptionText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.text },
});
