import React, { useMemo, useState, useEffect, useCallback } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  Linking,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { DataLoadingWrapper } from '@/components/DataLoadingWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, Student, Activity, AttendanceRecord } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/utils/api';
import { ClassPicker, NO_CLASS_FILTER } from '@/components/ClassPicker';

function getLast30Days() {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function StudentReportCard({ student, onPress, className, classColor }: { student: Student; onPress: () => void; className?: string | null; classColor?: string | null }) {
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
        <View style={styles.studentNameRow}>
          <Text style={styles.studentName}>{student.name}</Text>
          {className ? (
            <View style={[styles.classBadge, classColor ? { backgroundColor: classColor + '25' } : undefined]}>
              <Text style={[styles.classBadgeText, classColor ? { color: classColor } : undefined]} numberOfLines={1}>{className}</Text>
            </View>
          ) : null}
        </View>
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

function SubjectGroupRow({ group, expanded, onToggle, deliveries, onActivityPress }: {
  group: SubjectGroup;
  expanded: boolean;
  onToggle: () => void;
  deliveries: { activityId: string; delivered: boolean; seen: boolean }[];
  onActivityPress: (activity: Activity, delivered: boolean, seen: boolean) => void;
}) {
  return (
    <View style={styles.subjectGroup}>
      <TouchableOpacity style={styles.subjectGroupHeader} onPress={onToggle} activeOpacity={0.85}>
        <View style={styles.subjectGroupLeft}>
          <Text style={styles.subjectGroupName}>{group.subject}</Text>
          <View style={styles.subjectGroupStats}>
            <View style={[styles.miniStat, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.miniStatText, { color: '#166534' }]}>{group.delivered}</Text>
              <Text style={[styles.miniStatLabel, { color: '#166534' }]}>entregues</Text>
            </View>
            <View style={[styles.miniStat, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.miniStatText, { color: '#1D4ED8' }]}>{group.seen}</Text>
              <Text style={[styles.miniStatLabel, { color: '#1D4ED8' }]}>vistos</Text>
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
          <TouchableOpacity
            key={activity.id}
            style={styles.activitySubRow}
            onPress={() => onActivityPress(activity, delivered, seen)}
            activeOpacity={0.72}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.activitySubName} numberOfLines={1}>{activity.description}</Text>
              <Text style={styles.activitySubDate}>{d}/{m} · {activity.type === 'homework' ? 'Para casa' : 'Em sala'}</Text>
            </View>
            <View style={styles.activitySubBadges}>
              {delivered ? (
                <View style={[styles.smallBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark" size={11} color='#166534' />
                  <Text style={[styles.smallBadgeText, { color: '#166534' }]}>Entregue</Text>
                </View>
              ) : (
                <View style={[styles.smallBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="close" size={11} color='#991B1B' />
                  <Text style={[styles.smallBadgeText, { color: '#991B1B' }]}>Pendente</Text>
                </View>
              )}
              {seen ? (
                <View style={[styles.smallBadge, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="eye" size={11} color='#1D4ED8' />
                  <Text style={[styles.smallBadgeText, { color: '#1D4ED8' }]}>Visto</Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={13} color={Colors.textTertiary} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type JustificationModal = { rec: AttendanceRecord; date: string; mode: 'view' | 'edit' } | null;

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { students, classes, selectedClassId, setSelectedClassId, activities, attendance, getDeliveriesForStudent, justifyAbsence, isLoaded, loadError, loadData } = useApp();

  const hasUnclassifiedStudents = useMemo(() => students.some(s => s.classId === null), [students]);

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return students;
    if (selectedClassId === NO_CLASS_FILTER) return students.filter(s => s.classId === null);
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'activities' | 'reports' | 'attendance'>('activities');
  const [justModal, setJustModal] = useState<JustificationModal>(null);
  const [editJustText, setEditJustText] = useState('');
  const [activityModal, setActivityModal] = useState<{ activity: Activity; delivered: boolean; seen: boolean } | null>(null);
  const [sharingLink, setSharingLink] = useState(false);

  type StudentReport = { id: string; studentId: string; date: string; content: string; createdAt: string };
  const [privateReports, setPrivateReports] = useState<StudentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [newReportModal, setNewReportModal] = useState(false);
  const [newReportDateObj, setNewReportDateObj] = useState<Date>(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newReportContent, setNewReportContent] = useState('');
  const [savingReport, setSavingReport] = useState(false);
  const [editingReport, setEditingReport] = useState<StudentReport | null>(null);

  const fetchPrivateReports = useCallback(async () => {
    if (!selectedStudent || !token) return;
    setReportsLoading(true);
    try {
      const data = await apiFetch<StudentReport[]>(`/student-reports?studentId=${selectedStudent.id}`, { token });
      setPrivateReports(data);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível carregar os relatórios.');
    } finally {
      setReportsLoading(false);
    }
  }, [selectedStudent, token]);

  useEffect(() => {
    if (activeTab === 'reports' && selectedStudent) {
      fetchPrivateReports();
    }
  }, [activeTab, selectedStudent, fetchPrivateReports]);

  const handleSaveReport = async () => {
    if (!selectedStudent || !token || !newReportContent.trim()) return;
    const y = newReportDateObj.getFullYear();
    const m = String(newReportDateObj.getMonth() + 1).padStart(2, '0');
    const d = String(newReportDateObj.getDate()).padStart(2, '0');
    const reportDate = `${y}-${m}-${d}`;
    setSavingReport(true);
    try {
      await apiFetch('/student-reports', {
        method: 'POST',
        token,
        body: JSON.stringify({ studentId: selectedStudent.id, date: reportDate, content: newReportContent.trim() }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewReportModal(false);
      setNewReportContent('');
      setNewReportDateObj(new Date());
      setShowDatePicker(false);
      await fetchPrivateReports();
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível salvar o relatório.');
    } finally {
      setSavingReport(false);
    }
  };

  const handleUpdateReport = async () => {
    if (!selectedStudent || !token || !newReportContent.trim() || !editingReport) return;
    const y = newReportDateObj.getFullYear();
    const m = String(newReportDateObj.getMonth() + 1).padStart(2, '0');
    const d = String(newReportDateObj.getDate()).padStart(2, '0');
    const reportDate = `${y}-${m}-${d}`;
    setSavingReport(true);
    try {
      await apiFetch(`/student-reports/${editingReport.id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ date: reportDate, content: newReportContent.trim() }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewReportModal(false);
      setEditingReport(null);
      setNewReportContent('');
      setNewReportDateObj(new Date());
      setShowDatePicker(false);
      await fetchPrivateReports();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o relatório.');
    } finally {
      setSavingReport(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!token) return;
    try {
      await apiFetch(`/student-reports/${reportId}`, { method: 'DELETE', token });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchPrivateReports();
    } catch {
      Alert.alert('Erro', 'Não foi possível excluir o relatório.');
    }
  };

  const handleShareParentReport = async () => {
    if (!selectedStudent || !token) return;
    try {
      setSharingLink(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await apiFetch<{ url: string; expiresAt: string }>(`/students/${selectedStudent.id}/generate-parent-token`, {
        method: 'POST',
        token,
      });
      await Share.share({
        title: `Relatório de ${selectedStudent.name}`,
        message: `Relatório escolar de ${selectedStudent.name}: ${data.url}`,
        url: data.url,
      });
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível gerar o link de partilha.');
    } finally {
      setSharingLink(false);
    }
  };

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
          <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedStudent(null); setActiveTab('activities'); setExpandedSubjects(new Set()); setPrivateReports([]); }} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedStudent.name}</Text>
            <Text style={styles.headerSub}>Relatório completo</Text>
          </View>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareParentReport}
            activeOpacity={0.8}
            disabled={sharingLink}
          >
            {sharingLink
              ? <ActivityIndicator size={18} color={Colors.primary} />
              : <Ionicons name="share-outline" size={22} color={Colors.primary} />
            }
          </TouchableOpacity>
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
            style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={16} color={activeTab === 'reports' ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>Relatórios</Text>
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

        {activeTab === 'reports' ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, gap: 10 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.addReportBtn}
              onPress={() => {
                setEditingReport(null);
                setNewReportDateObj(new Date());
                setShowDatePicker(false);
                setNewReportContent('');
                setNewReportModal(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addReportBtnText}>Adicionar relatório</Text>
            </TouchableOpacity>
            {reportsLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            ) : privateReports.length === 0 ? (
              <View style={[styles.emptyState, { marginTop: 40 }]}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
                </View>
                <Text style={styles.emptyTitle}>Nenhum relatório</Text>
                <Text style={styles.emptySubtitle}>Toque em "Adicionar relatório" para registrar o primeiro</Text>
              </View>
            ) : (
              privateReports.map(report => {
                const [ry, rm, rd] = report.date.split('-');
                return (
                  <View key={report.id} style={styles.reportCard}>
                    <View style={styles.reportCardHeader}>
                      <View style={styles.reportDateBadge}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                        <Text style={styles.reportDateText}>{rd}/{rm}/{ry}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => {
                            const [y2, m2, d2] = report.date.split('-');
                            const date = new Date(parseInt(y2), parseInt(m2) - 1, parseInt(d2));
                            setEditingReport(report);
                            setNewReportDateObj(date);
                            setNewReportContent(report.content);
                            setShowDatePicker(false);
                            setNewReportModal(true);
                          }}
                          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          activeOpacity={0.7}
                        >
                          <Feather name="edit-2" size={15} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            Alert.alert(
                              'Excluir relatório',
                              'Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Excluir', style: 'destructive', onPress: () => handleDeleteReport(report.id) },
                              ]
                            );
                          }}
                          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={15} color={Colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.reportContent}>{report.content}</Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : activeTab === 'activities' ? (
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
                  onActivityPress={(activity, delivered, seen) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActivityModal({ activity, delivered, seen });
                  }}
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

      {/* New Report Creation Modal */}
      <Modal visible={newReportModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={() => setNewReportModal(false)}>
            <View style={[modalStyles.card, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>{editingReport ? 'Editar Relatório' : 'Novo Relatório'}</Text>
              <Text style={[modalStyles.subtitle, { marginBottom: 4 }]}>Visível apenas para o professor</Text>
              <TouchableOpacity
                style={styles.reportDateRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.reportDateInput}>
                  {newReportDateObj.toLocaleDateString('pt-BR')}
                </Text>
                <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={newReportDateObj}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (date) setNewReportDateObj(date);
                  }}
                />
              )}
              <TextInput
                style={[modalStyles.input, { minHeight: 120 }]}
                placeholder="Escreva o relatório do aluno para esta data..."
                placeholderTextColor={Colors.textTertiary}
                value={newReportContent}
                onChangeText={setNewReportContent}
                multiline
                autoFocus
                textAlignVertical="top"
              />
              <View style={modalStyles.buttons}>
                <TouchableOpacity
                  style={modalStyles.cancelBtn}
                  onPress={() => { setNewReportModal(false); setEditingReport(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.confirmBtn, (!newReportContent.trim() || savingReport) && modalStyles.btnDisabled]}
                  onPress={editingReport ? handleUpdateReport : handleSaveReport}
                  activeOpacity={0.85}
                  disabled={!newReportContent.trim() || savingReport}
                >
                  {savingReport ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={modalStyles.confirmBtnText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Activity Detail Modal */}
      {activityModal && (
        <Modal visible={true} transparent animationType="slide">
          <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={() => setActivityModal(null)}>
            <View style={[modalStyles.card, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
              <View style={modalStyles.handle} />
              <View style={modalStyles.titleRow}>
                <View style={[modalStyles.iconCircle, {
                  backgroundColor: activityModal.activity.type === 'homework' ? '#FFEDD5' : '#DBEAFE',
                }]}>
                  <Ionicons
                    name={activityModal.activity.type === 'homework' ? 'home-outline' : 'school-outline'}
                    size={20}
                    color={activityModal.activity.type === 'homework' ? '#C2410C' : '#1D4ED8'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.title} numberOfLines={2}>{activityModal.activity.description}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <View style={[styles.smallBadge, {
                      backgroundColor: activityModal.activity.type === 'homework' ? '#FFEDD5' : '#DBEAFE',
                    }]}>
                      <Text style={[styles.smallBadgeText, {
                        color: activityModal.activity.type === 'homework' ? '#C2410C' : '#1D4ED8',
                      }]}>
                        {activityModal.activity.type === 'homework' ? 'Para casa' : 'Em sala'}
                      </Text>
                    </View>
                    <View style={[styles.smallBadge, { backgroundColor: Colors.surfaceSecondary }]}>
                      <Text style={[styles.smallBadgeText, { color: Colors.textSecondary }]}>{activityModal.activity.subject}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setActivityModal(null)}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceSecondary, borderRadius: 12, padding: 12 }}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary }}>
                  {(() => { const [y, m, d] = activityModal.activity.date.split('-'); return `${d}/${m}/${y}`; })()}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[styles.smallBadge, {
                  backgroundColor: activityModal.delivered ? '#DCFCE7' : '#FEE2E2',
                  flex: 1, justifyContent: 'center', paddingVertical: 10,
                }]}>
                  <Ionicons
                    name={activityModal.delivered ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={activityModal.delivered ? '#166534' : '#991B1B'}
                  />
                  <Text style={[styles.smallBadgeText, {
                    color: activityModal.delivered ? '#166534' : '#991B1B', fontSize: 13,
                  }]}>
                    {activityModal.delivered ? 'Entregue' : 'Pendente'}
                  </Text>
                </View>
                {activityModal.seen && (
                  <View style={[styles.smallBadge, { backgroundColor: '#DBEAFE', paddingVertical: 10 }]}>
                    <Ionicons name="eye" size={16} color='#1D4ED8' />
                    <Text style={[styles.smallBadgeText, { color: '#1D4ED8', fontSize: 13 }]}>Visto</Text>
                  </View>
                )}
              </View>

              {activityModal.activity.link ? (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryLight, padding: 14, borderRadius: 12 }}
                  onPress={async () => {
                    let url = activityModal.activity.link!.trim();
                    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
                    const supported = await Linking.canOpenURL(url);
                    if (supported) {
                      Linking.openURL(url);
                    } else {
                      Alert.alert('Link inválido', 'Não foi possível abrir este link.');
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Feather name="external-link" size={16} color={Colors.primary} />
                  <Text style={{ flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.primary }} numberOfLines={1}>
                    {activityModal.activity.link}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={modalStyles.closeBtn} onPress={() => setActivityModal(null)} activeOpacity={0.8}>
                <Text style={modalStyles.closeBtnText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
          <Text style={styles.headerSub}>{filteredStudents.length} alunos</Text>
        </View>
      </View>

      <ClassPicker
        classes={classes}
        selectedClassId={selectedClassId}
        onSelect={setSelectedClassId}
        showNoClass={hasUnclassifiedStudents || selectedClassId === NO_CLASS_FILTER}
      />

      <DataLoadingWrapper isLoaded={isLoaded} loadError={loadError} onRetry={loadData}>
      {filteredStudents.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bar-chart-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>
            {selectedClassId === NO_CLASS_FILTER ? 'Nenhum aluno sem turma' : selectedClassId ? 'Nenhum aluno nesta turma' : 'Nenhum dado ainda'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {selectedClassId === NO_CLASS_FILTER ? 'Todos os alunos já têm turma' : selectedClassId ? 'Adicione alunos a esta turma' : 'Adicione alunos e atividades para ver relatórios'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <StudentReportCard
              student={item}
              onPress={() => setSelectedStudent(item)}
              className={!selectedClassId ? classes.find(c => c.id === item.classId)?.name ?? null : null}
              classColor={!selectedClassId ? classes.find(c => c.id === item.classId)?.color ?? null : null}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
      </DataLoadingWrapper>
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
  shareBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
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
  studentNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  studentName: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  classBadge: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  classBadgeText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
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
  addReportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primaryLight, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
    borderWidth: 1.5, borderColor: Colors.primary + '40',
  },
  addReportBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  reportCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  reportCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  reportDateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  reportDateText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  reportContent: { fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text, lineHeight: 22 },
  reportDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceSecondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  reportDateInput: {
    flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', color: Colors.text,
  },
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
