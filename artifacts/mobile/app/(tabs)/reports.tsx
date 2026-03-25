import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, Student, Activity, AttendanceRecord } from '@/context/AppContext';

function getLast30Days() {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function StudentReportCard({ student, onPress }: { student: Student; onPress: () => void }) {
  const { activities, getDeliveriesForStudent } = useApp();
  const deliveries = getDeliveriesForStudent(student.id);
  const deliveredCount = deliveries.filter(d => d.delivered).length;
  const total = activities.length;
  const rate = total > 0 ? Math.round((deliveredCount / total) * 100) : 100;
  const color = rate >= 80 ? Colors.success : rate >= 50 ? Colors.warning : Colors.danger;

  return (
    <TouchableOpacity style={styles.studentCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.avatarCircle, { backgroundColor: Colors.primaryLight }]}>
        <Text style={styles.avatarText}>{student.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentStats}>{deliveredCount} de {total} atividades entregues</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${rate}%` as any, backgroundColor: color }]} />
        </View>
      </View>
      <View style={[styles.rateBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.rateText, { color }]}>{rate}%</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

type SubjectGroup = {
  subject: string;
  activities: Activity[];
  delivered: number;
  seen: number;
};

function SubjectGroupRow({ group, expanded, onToggle, deliveries }: {
  group: SubjectGroup;
  expanded: boolean;
  onToggle: () => void;
  deliveries: { activityId: string; delivered: boolean; seen: boolean }[];
}) {
  return (
    <View style={styles.subjectGroup}>
      <TouchableOpacity style={styles.subjectGroupHeader} onPress={onToggle} activeOpacity={0.85}>
        <View style={styles.subjectGroupLeft}>
          <Text style={styles.subjectGroupName}>{group.subject}</Text>
          <View style={styles.subjectGroupStats}>
            <View style={[styles.miniStat, { backgroundColor: Colors.successLight }]}>
              <Text style={[styles.miniStatText, { color: Colors.success }]}>{group.delivered}</Text>
              <Text style={styles.miniStatLabel}>entregues</Text>
            </View>
            <View style={[styles.miniStat, { backgroundColor: Colors.primaryLight }]}>
              <Text style={[styles.miniStatText, { color: Colors.primary }]}>{group.seen}</Text>
              <Text style={styles.miniStatLabel}>vistos</Text>
            </View>
            <View style={[styles.miniStat, { backgroundColor: Colors.surfaceSecondary }]}>
              <Text style={[styles.miniStatText, { color: Colors.text }]}>{group.activities.length}</Text>
              <Text style={styles.miniStatLabel}>total</Text>
            </View>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
      {expanded && group.activities.map(activity => {
        const rec = deliveries.find(d => d.activityId === activity.id);
        const delivered = rec?.delivered ?? false;
        const seen = rec?.seen ?? false;
        const [, m, d] = activity.date.split('-');
        return (
          <View key={activity.id} style={styles.activitySubRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.activitySubName} numberOfLines={1}>{activity.description}</Text>
              <Text style={styles.activitySubDate}>{d}/{m} · {activity.type === 'homework' ? 'Para casa' : 'Em sala'}</Text>
            </View>
            <View style={styles.activitySubBadges}>
              {delivered ? (
                <View style={[styles.smallBadge, { backgroundColor: Colors.successLight }]}>
                  <Ionicons name="checkmark" size={11} color={Colors.success} />
                  <Text style={[styles.smallBadgeText, { color: Colors.success }]}>Entregue</Text>
                </View>
              ) : (
                <View style={[styles.smallBadge, { backgroundColor: Colors.dangerLight }]}>
                  <Ionicons name="close" size={11} color={Colors.danger} />
                  <Text style={[styles.smallBadgeText, { color: Colors.danger }]}>Pendente</Text>
                </View>
              )}
              {seen ? (
                <View style={[styles.smallBadge, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="eye" size={11} color={Colors.primary} />
                  <Text style={[styles.smallBadgeText, { color: Colors.primary }]}>Visto</Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

type JustificationModal = { rec: AttendanceRecord; date: string; mode: 'view' | 'edit' } | null;

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { students, activities, attendance, getDeliveriesForStudent, justifyAbsence } = useApp();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'activities' | 'attendance'>('activities');
  const [justModal, setJustModal] = useState<JustificationModal>(null);
  const [editJustText, setEditJustText] = useState('');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;
  const allDays = useMemo(() => getLast30Days(), []);

  const toggleSubject = (subject: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  const studentDeliveries = useMemo(() => {
    if (!selectedStudent) return [];
    return getDeliveriesForStudent(selectedStudent.id);
  }, [selectedStudent, getDeliveriesForStudent]);

  const subjectGroups: SubjectGroup[] = useMemo(() => {
    if (!selectedStudent) return [];
    const groups: Record<string, SubjectGroup> = {};
    activities
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(activity => {
        if (!groups[activity.subject]) {
          groups[activity.subject] = { subject: activity.subject, activities: [], delivered: 0, seen: 0 };
        }
        groups[activity.subject].activities.push(activity);
        const rec = studentDeliveries.find(d => d.activityId === activity.id);
        if (rec?.delivered) groups[activity.subject].delivered += 1;
        if (rec?.seen) groups[activity.subject].seen += 1;
      });
    return Object.values(groups).sort((a, b) => a.subject.localeCompare(b.subject, 'pt-BR'));
  }, [selectedStudent, activities, studentDeliveries]);

  const attendanceStats = useMemo(() => {
    if (!selectedStudent) return { presences: 0, absences: 0, justified: 0 };
    const recs = attendance.filter(a => a.studentId === selectedStudent.id && allDays.includes(a.date));
    const absences = recs.filter(a => !a.present && !a.justified).length;
    const justified = recs.filter(a => !a.present && a.justified).length;
    const presences = allDays.length - absences - justified;
    return { presences, absences, justified };
  }, [selectedStudent, attendance, allDays]);

  if (selectedStudent) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedStudent(null); setActiveTab('activities'); setExpandedSubjects(new Set()); }} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedStudent.name}</Text>
            <Text style={styles.headerSub}>Relatório completo</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activities' && styles.tabActive]}
            onPress={() => setActiveTab('activities')}
            activeOpacity={0.8}
          >
            <Ionicons name="book-outline" size={16} color={activeTab === 'activities' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'activities' && styles.tabTextActive]}>Atividades</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'attendance' && styles.tabActive]}
            onPress={() => setActiveTab('attendance')}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={16} color={activeTab === 'attendance' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>Presença</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'activities' ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, gap: 10 }} showsVerticalScrollIndicator={false}>
            {/* Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: Colors.success }]}>{studentDeliveries.filter(d => d.delivered).length}</Text>
                <Text style={styles.summaryLabel}>Entregues</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: Colors.primary }]}>{studentDeliveries.filter(d => d.seen).length}</Text>
                <Text style={styles.summaryLabel}>Vistos</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: Colors.text }]}>{activities.length}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
            </View>

            {subjectGroups.length === 0 ? (
              <View style={[styles.emptyState, { marginTop: 40 }]}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="document-outline" size={48} color={Colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>Nenhuma atividade</Text>
                <Text style={styles.emptySubtitle}>Adicione atividades na aba Atividades</Text>
              </View>
            ) : (
              subjectGroups.map(group => (
                <SubjectGroupRow
                  key={group.subject}
                  group={group}
                  expanded={expandedSubjects.has(group.subject)}
                  onToggle={() => toggleSubject(group.subject)}
                  deliveries={studentDeliveries}
                />
              ))
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, gap: 10 }} showsVerticalScrollIndicator={false}>
            {/* Attendance Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: Colors.success }]}>{attendanceStats.presences}</Text>
                <Text style={styles.summaryLabel}>Presenças</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: Colors.danger }]}>{attendanceStats.absences}</Text>
                <Text style={styles.summaryLabel}>Faltas</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: Colors.warning }]}>{attendanceStats.justified}</Text>
                <Text style={styles.summaryLabel}>Justificadas</Text>
              </View>
            </View>
            <Text style={styles.attendanceNote}>Baseado nos últimos 30 dias registrados</Text>

            {/* Attendance list */}
            {allDays.filter(day => {
              const rec = attendance.find(a => a.studentId === selectedStudent.id && a.date === day);
              return rec && !rec.present;
            }).map(day => {
              const rec = attendance.find(a => a.studentId === selectedStudent.id && a.date === day)!;
              const [y, m, d] = day.split('-');
              const isJustified = rec.justified;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.attendanceRow, isJustified ? styles.attendanceJustified : styles.attendanceAbsent]}
                  onPress={() => {
                    if (isJustified) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setJustModal({ rec, date: day, mode: 'view' });
                      setEditJustText(rec.justification ?? '');
                    }
                  }}
                  activeOpacity={isJustified ? 0.75 : 1}
                >
                  <View style={[styles.attendanceDot, { backgroundColor: isJustified ? Colors.warningLight : Colors.dangerLight }]}>
                    <Ionicons name={isJustified ? 'alert' : 'close'} size={16} color={isJustified ? Colors.warning : Colors.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attendanceDate}>{d}/{m}/{y}</Text>
                    {rec.justification ? (
                      <Text style={styles.attendanceJustText} numberOfLines={2}>{rec.justification}</Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.smallBadge, { backgroundColor: isJustified ? Colors.warningLight : Colors.dangerLight }]}>
                      <Text style={[styles.smallBadgeText, { color: isJustified ? Colors.warning : Colors.danger }]}>
                        {isJustified ? 'Justificada' : 'Falta'}
                      </Text>
                    </View>
                    {isJustified && <Feather name="edit-2" size={14} color={Colors.warning} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            {attendanceStats.absences === 0 && attendanceStats.justified === 0 && (
              <View style={[styles.emptyState, { marginTop: 40 }]}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
                </View>
                <Text style={styles.emptyTitle}>Presença perfeita!</Text>
                <Text style={styles.emptySubtitle}>Nenhuma falta registrada nos últimos 30 dias</Text>
              </View>
            )}
          </ScrollView>
        )}

      {/* Justification Full-View / Edit Modal */}
      <Modal visible={!!justModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={() => setJustModal(null)}>
          <View style={[modalStyles.card, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={modalStyles.handle} />
            {justModal?.mode === 'view' ? (
              <>
                <View style={modalStyles.titleRow}>
                  <View style={[modalStyles.iconCircle, { backgroundColor: Colors.warningLight }]}>
                    <Ionicons name="document-text" size={20} color={Colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.title}>Justificativa</Text>
                    <Text style={modalStyles.subtitle}>
                      {justModal?.date ? (() => { const [y, m, d] = justModal.date.split('-'); return `${d}/${m}/${y}`; })() : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={modalStyles.editBtn}
                    onPress={() => setJustModal(j => j ? { ...j, mode: 'edit' } : null)}
                    activeOpacity={0.8}
                  >
                    <Feather name="edit-2" size={16} color={Colors.primary} />
                    <Text style={modalStyles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={modalStyles.textScroll} showsVerticalScrollIndicator={false}>
                  <Text style={modalStyles.justText}>
                    {justModal?.rec.justification || '(sem justificativa)'}
                  </Text>
                </ScrollView>
                <TouchableOpacity style={modalStyles.closeBtn} onPress={() => setJustModal(null)} activeOpacity={0.8}>
                  <Text style={modalStyles.closeBtnText}>Fechar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={modalStyles.title}>Editar justificativa</Text>
                <Text style={modalStyles.subtitle}>
                  {justModal?.date ? (() => { const [y, m, d] = justModal.date.split('-'); return `${d}/${m}/${y}`; })() : ''}
                </Text>
                <ScrollView style={{ maxHeight: 160 }} keyboardShouldPersistTaps="handled">
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Descreva o motivo..."
                    placeholderTextColor={Colors.textTertiary}
                    value={editJustText}
                    onChangeText={setEditJustText}
                    multiline
                    autoFocus
                  />
                </ScrollView>
                <View style={modalStyles.buttons}>
                  <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setJustModal(j => j ? { ...j, mode: 'view' } : null)} activeOpacity={0.8}>
                    <Text style={modalStyles.cancelBtnText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.confirmBtn, !editJustText.trim() && modalStyles.btnDisabled]}
                    onPress={async () => {
                      if (!justModal || !selectedStudent || !editJustText.trim()) return;
                      await justifyAbsence(selectedStudent.id, justModal.date, editJustText.trim());
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setJustModal(null);
                    }}
                    activeOpacity={0.85}
                    disabled={!editJustText.trim()}
                  >
                    <Text style={modalStyles.confirmBtnText}>Salvar</Text>
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

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Relatórios</Text>
          <Text style={styles.headerSub}>{students.length} alunos</Text>
        </View>
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bar-chart-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum dado ainda</Text>
          <Text style={styles.emptySubtitle}>Adicione alunos e atividades para ver relatórios</Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <StudentReportCard student={item} onPress={() => setSelectedStudent(item)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontFamily: 'Inter_600SemiBold' },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 2,
  },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.primary },
  studentInfo: { flex: 1, gap: 4 },
  studentName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  studentStats: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
  rateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  rateText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryNum: { fontSize: 28, fontFamily: 'Inter_700Bold', color: Colors.success },
  summaryLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  subjectGroup: {
    backgroundColor: Colors.surface, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
  },
  subjectGroupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, gap: 12,
  },
  subjectGroupLeft: { flex: 1, gap: 8 },
  subjectGroupName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  subjectGroupStats: { flexDirection: 'row', gap: 8 },
  miniStat: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  miniStatText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  miniStatLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  activitySubRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    gap: 8,
  },
  activitySubName: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.text },
  activitySubDate: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  activitySubBadges: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' },
  smallBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  smallBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  attendanceNote: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textTertiary, textAlign: 'center' },
  attendanceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14,
    padding: 14, gap: 12, borderWidth: 1.5, marginBottom: 2,
  },
  attendanceAbsent: { borderColor: '#FFD5D3', backgroundColor: Colors.dangerLight },
  attendanceJustified: { borderColor: '#FFD9A0', backgroundColor: Colors.warningLight },
  attendanceDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  attendanceDate: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  attendanceJustText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 14,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.text },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },
  editBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  textScroll: { maxHeight: 200, backgroundColor: Colors.surfaceSecondary, borderRadius: 14, padding: 14 },
  justText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, lineHeight: 24 },
  closeBtn: {
    height: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: Colors.surfaceSecondary,
  },
  closeBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: 12, minHeight: 100,
    paddingHorizontal: 14, paddingTop: 12, fontSize: 15, fontFamily: 'Inter_400Regular',
    color: Colors.text, borderWidth: 1.5, borderColor: Colors.border, textAlignVertical: 'top',
  },
  buttons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: Colors.surfaceSecondary,
  },
  cancelBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  confirmBtn: {
    flex: 1, height: 52, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: Colors.primary,
  },
  confirmBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
});
