import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { useApp, Student } from '@/context/AppContext';

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

type StudentAction = { student: Student; mode: 'options' | 'edit' } | null;

function StudentCard({ student, isAbsent, onToggle, onLongPress }: {
  student: Student;
  isAbsent: boolean;
  onToggle: () => void;
  onLongPress: () => void;
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
        <Text style={[styles.studentName, isAbsent && styles.studentNameAbsent]} numberOfLines={1}>
          {student.name}
        </Text>
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
  const { students, addStudent, removeStudent, editStudent, toggleAttendance, getAttendanceForDate } = useApp();
  const [selectedDate] = useState(formatDate(new Date()));
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [adding, setAdding] = useState(false);
  const [studentAction, setStudentAction] = useState<StudentAction>(null);
  const [editName, setEditName] = useState('');

  const dateAttendance = getAttendanceForDate(selectedDate);
  const isAbsent = (studentId: string) => {
    const record = dateAttendance.find(a => a.studentId === studentId);
    return record ? !record.present : false;
  };
  const absentCount = students.filter(s => isAbsent(s.id)).length;
  const presentCount = students.length - absentCount;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) return;
    setAdding(true);
    await addStudent(newStudentName);
    setNewStudentName('');
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
    setStudentAction({ student: studentAction.student, mode: 'edit' });
  };

  const handleSaveEdit = async () => {
    if (!studentAction || !editName.trim()) return;
    await editStudent(studentAction.student.id, editName);
    setStudentAction(null);
    setEditName('');
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
        <View>
          <Text style={styles.headerTitle}>Chamada</Text>
          <Text style={styles.headerDate}>{formatDateDisplay(selectedDate)}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {students.length > 0 && (
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

      {students.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum aluno cadastrado</Text>
          <Text style={styles.emptySubtitle}>Toque no + para adicionar alunos</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Adicionar aluno</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <StudentCard
              student={item}
              isAbsent={isAbsent(item.id)}
              onToggle={() => toggleAttendance(item.id, selectedDate)}
              onLongPress={() => openOptions(item)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Student Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
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
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowAddModal(false); setNewStudentName(''); }} activeOpacity={0.8}>
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
        </View>
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
                <TouchableOpacity style={[styles.optionRow, styles.optionDelete]} onPress={handleDelete} activeOpacity={0.85}>
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  <Text style={[styles.optionText, { color: Colors.danger }]}>Remover aluno</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setStudentAction(null)} activeOpacity={0.8}>
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
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.text, letterSpacing: -0.5 },
  headerDate: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  addButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 8 },
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
  studentName: { flex: 1, fontSize: 17, fontFamily: 'Inter_500Medium', color: Colors.text },
  studentNameAbsent: { color: Colors.danger },
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
});
