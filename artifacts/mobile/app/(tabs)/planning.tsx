import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useApp, Activity } from '@/context/AppContext';
import { apiFetch, ApiError } from '@/utils/api';
import { toISO, getBrasiliaDate, formatBR } from '@/utils/date';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type LessonPlan = {
  id: string;
  date: string;
  description: string;
  activityIds: string[];
};

function getMonthISO(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getTodayISO(): string {
  return toISO(getBrasiliaDate());
}

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { activities } = useApp();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const today = useMemo(() => new Date(getBrasiliaDate()), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkModal, setLinkModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newAct, setNewAct] = useState({ description: '', type: 'homework' as 'homework' | 'classwork', subject: '' });
  const [creatingAct, setCreatingAct] = useState(false);

  const monthStr = getMonthISO(year, month);
  const todayISO = useMemo(() => getTodayISO(), []);

  const fetchPlans = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<LessonPlan[]>(`/lesson-plans?month=${monthStr}`, { token });
      setPlans(data);
    } catch (err: any) {
      console.error('Error fetching lesson plans:', err);
    } finally {
      setLoading(false);
    }
  }, [monthStr, token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const plansByDate = useMemo(() => {
    const map: Record<string, LessonPlan> = {};
    plans.forEach(p => { map[p.date] = p; });
    return map;
  }, [plans]);

  const selectedPlan = selectedDate ? plansByDate[selectedDate] : null;

  useEffect(() => {
    setDescription(selectedPlan?.description ?? '');
  }, [selectedDate, selectedPlan?.id]);

  const cells = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const goToPrevMonth = () => {
    setSelectedDate(null);
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    setSelectedDate(null);
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const handleSave = async () => {
    if (!selectedDate || !token) return;
    setSaving(true);
    try {
      const data = await apiFetch<LessonPlan>('/lesson-plans', {
        method: 'POST',
        token,
        body: JSON.stringify({ date: selectedDate, description }),
      });
      setPlans(prev => {
        const filtered = prev.filter(p => p.date !== selectedDate);
        return [...filtered, data];
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o planejamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkActivity = async (activityId: string) => {
    if (!selectedDate || !token) return;
    let planId = selectedPlan?.id;
    if (!planId) {
      try {
        const data = await apiFetch<LessonPlan>('/lesson-plans', {
          method: 'POST',
          token,
          body: JSON.stringify({ date: selectedDate, description }),
        });
        planId = data.id;
        setPlans(prev => {
          const filtered = prev.filter(p => p.date !== selectedDate);
          return [...filtered, data];
        });
      } catch {
        Alert.alert('Erro', 'Não foi possível criar o planejamento.');
        return;
      }
    }
    try {
      await apiFetch(`/lesson-plans/${planId}/activities`, {
        method: 'POST',
        token,
        body: JSON.stringify({ activityId }),
      });
      setPlans(prev => prev.map(p => p.id === planId
        ? { ...p, activityIds: p.activityIds.includes(activityId) ? p.activityIds : [...p.activityIds, activityId] }
        : p
      ));
      setLinkModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Erro', 'Não foi possível associar a atividade.');
    }
  };

  const handleUnlinkActivity = async (activityId: string) => {
    if (!selectedPlan || !token) return;
    try {
      await apiFetch(`/lesson-plans/${selectedPlan.id}/activities/${activityId}`, {
        method: 'DELETE',
        token,
      });
      setPlans(prev => prev.map(p => p.id === selectedPlan.id
        ? { ...p, activityIds: p.activityIds.filter(id => id !== activityId) }
        : p
      ));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Erro', 'Não foi possível desassociar a atividade.');
    }
  };

  const handleCreateAndLink = async () => {
    if (!selectedDate || !newAct.description.trim() || !token) return;
    setCreatingAct(true);
    try {
      type ApiActivity = { id: string; subject: string; type: string; description: string; date: string; createdAt: string };
      const createdActivity = await apiFetch<ApiActivity>('/activities', {
        method: 'POST',
        token,
        body: JSON.stringify({
          subject: newAct.subject || (activities[0]?.subject ?? 'Geral'),
          type: newAct.type,
          description: newAct.description,
          date: selectedDate,
        }),
      });
      await handleLinkActivity(createdActivity.id);
      setCreateModal(false);
      setNewAct({ description: '', type: 'homework', subject: '' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a atividade.');
    } finally {
      setCreatingAct(false);
    }
  };

  const linkedActivities = useMemo(() => {
    if (!selectedPlan) return [];
    return selectedPlan.activityIds.map(id => activities.find(a => a.id === id)).filter(Boolean) as Activity[];
  }, [selectedPlan, activities]);

  const availableToLink = useMemo(() => {
    const linked = new Set(selectedPlan?.activityIds ?? []);
    return activities.filter(a => !linked.has(a.id));
  }, [activities, selectedPlan]);

  const subjects = useMemo(() => {
    const set = new Set(activities.map(a => a.subject));
    return Array.from(set);
  }, [activities]);

  if (selectedDate) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedDate(null)} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle} numberOfLines={1}>{formatBR(selectedDate)}</Text>
            <Text style={styles.headerSub}>Planejamento do dia</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, gap: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Description */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Descritivo da Aula</Text>
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Descreva os objetivos, conteúdos e metodologias previstas para este dia..."
                placeholderTextColor={Colors.textTertiary}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.saveBtnText}>Salvar</Text></>
                }
              </TouchableOpacity>
            </View>

            {/* Activities */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Atividades do Dia</Text>
              </View>
              <View style={styles.actBtnRow}>
                <TouchableOpacity style={styles.actBtn} onPress={() => setLinkModal(true)} activeOpacity={0.8}>
                  <Ionicons name="link-outline" size={15} color={Colors.text} />
                  <Text style={styles.actBtnText}>Associar existente</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actBtn, styles.actBtnPrimary]} onPress={() => setCreateModal(true)} activeOpacity={0.8}>
                  <Ionicons name="add" size={15} color={Colors.primary} />
                  <Text style={[styles.actBtnText, { color: Colors.primary }]}>Nova atividade</Text>
                </TouchableOpacity>
              </View>

              {linkedActivities.length === 0 ? (
                <View style={styles.emptyActivities}>
                  <Ionicons name="book-outline" size={32} color={Colors.textTertiary} />
                  <Text style={styles.emptyActText}>Nenhuma atividade associada</Text>
                </View>
              ) : (
                linkedActivities.map(activity => (
                  <View key={activity.id} style={styles.activityRow}>
                    <View style={[styles.typeDot, { backgroundColor: activity.type === 'homework' ? '#FFEDD5' : '#DBEAFE' }]}>
                      <Text style={[styles.typeDotText, { color: activity.type === 'homework' ? '#C2410C' : '#1D4ED8' }]}>
                        {activity.type === 'homework' ? 'Casa' : 'Sala'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activitySubject} numberOfLines={1}>{activity.subject}</Text>
                      <Text style={styles.activityDesc} numberOfLines={2}>{activity.description}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUnlinkActivity(activity.id)}
                      style={styles.unlinkBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Link Activity Modal */}
        <Modal visible={linkModal} transparent animationType="slide">
          <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={() => setLinkModal(false)}>
            <View style={[modalStyles.card, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>Associar atividade</Text>
              <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                {availableToLink.length === 0 ? (
                  <Text style={modalStyles.emptyText}>Nenhuma atividade disponível para associar.</Text>
                ) : (
                  availableToLink.map(a => (
                    <TouchableOpacity key={a.id} style={modalStyles.actRow} onPress={() => handleLinkActivity(a.id)} activeOpacity={0.8}>
                      <View style={[modalStyles.typePill, { backgroundColor: a.type === 'homework' ? '#FFEDD5' : '#DBEAFE' }]}>
                        <Text style={[modalStyles.typePillText, { color: a.type === 'homework' ? '#C2410C' : '#1D4ED8' }]}>
                          {a.type === 'homework' ? 'Casa' : 'Sala'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={modalStyles.actSubject}>{a.subject}</Text>
                        <Text style={modalStyles.actDesc} numberOfLines={1}>{a.description}</Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setLinkModal(false)} activeOpacity={0.8}>
                <Text style={modalStyles.cancelText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Create Activity Modal */}
        <Modal visible={createModal} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={() => setCreateModal(false)}>
              <View style={[modalStyles.card, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
                <View style={modalStyles.handle} />
                <Text style={modalStyles.title}>Nova atividade</Text>

                {subjects.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {subjects.map(sub => (
                        <TouchableOpacity
                          key={sub}
                          style={[modalStyles.subjectChip, newAct.subject === sub && modalStyles.subjectChipActive]}
                          onPress={() => setNewAct(a => ({ ...a, subject: sub }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[modalStyles.subjectChipText, newAct.subject === sub && modalStyles.subjectChipActiveText]}>{sub}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}

                <View style={modalStyles.typeRow}>
                  <TouchableOpacity
                    style={[modalStyles.typeBtn, newAct.type === 'homework' && { borderColor: '#C2410C', backgroundColor: '#FFEDD5' }]}
                    onPress={() => setNewAct(a => ({ ...a, type: 'homework' }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[modalStyles.typeBtnText, newAct.type === 'homework' && { color: '#C2410C' }]}>Para casa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.typeBtn, newAct.type === 'classwork' && { borderColor: Colors.primary, backgroundColor: '#DBEAFE' }]}
                    onPress={() => setNewAct(a => ({ ...a, type: 'classwork' }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[modalStyles.typeBtnText, newAct.type === 'classwork' && { color: Colors.primary }]}>Em sala</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[modalStyles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                  placeholder="Descrição da atividade..."
                  placeholderTextColor={Colors.textTertiary}
                  value={newAct.description}
                  onChangeText={t => setNewAct(a => ({ ...a, description: t }))}
                  multiline
                  autoFocus
                />

                <View style={modalStyles.buttons}>
                  <TouchableOpacity style={modalStyles.cancelBtn} onPress={() => setCreateModal(false)} activeOpacity={0.8}>
                    <Text style={modalStyles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.confirmBtn, (!newAct.description.trim() || creatingAct) && { opacity: 0.5 }]}
                    onPress={handleCreateAndLink}
                    disabled={!newAct.description.trim() || creatingAct}
                    activeOpacity={0.85}
                  >
                    {creatingAct
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={modalStyles.confirmText}>Criar e associar</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Month navigation header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={goToPrevMonth} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>{MONTH_NAMES[month]}</Text>
          <Text style={styles.headerSub}>{year}</Text>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={goToNextMonth} activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: bottomPadding + 100 }} showsVerticalScrollIndicator={false}>
        {/* Day labels */}
        <View style={styles.dayLabelRow}>
          {DAY_LABELS.map(d => (
            <Text key={d} style={styles.dayLabel}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.calendarGrid}>
            {cells.map((dateStr, i) => {
              if (!dateStr) {
                return <View key={`empty-${i}`} style={styles.dayCell} />;
              }
              const hasPlan = !!plansByDate[dateStr];
              const isToday = dateStr === todayISO;
              const [, , d] = dateStr.split('-');

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    hasPlan && !isToday && styles.dayCellHasPlan,
                  ]}
                  onPress={() => setSelectedDate(dateStr)}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    styles.dayNum,
                    isToday && styles.dayNumToday,
                    hasPlan && !isToday && styles.dayNumHasPlan,
                  ]}>
                    {parseInt(d)}
                  </Text>
                  {hasPlan && (
                    <View style={[styles.planDot, isToday && styles.planDotToday]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.legendText}>Com planejamento</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primaryLight, borderWidth: 2, borderColor: Colors.primary }]} />
            <Text style={styles.legendText}>Hoje</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMid: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 1 },

  dayLabelRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 2,
  },
  dayCellToday: {
    backgroundColor: Colors.primary,
  },
  dayCellHasPlan: {
    backgroundColor: Colors.primaryLight,
  },
  dayNum: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.text,
  },
  dayNumToday: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  dayNumHasPlan: {
    color: Colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  planDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  planDotToday: {
    backgroundColor: '#fff',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 24,
    paddingBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text, marginBottom: 10 },
  descriptionInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 140,
    backgroundColor: Colors.background,
    lineHeight: 22,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' },
  actBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  actBtnPrimary: {
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primaryLight,
  },
  actBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.text },
  emptyActivities: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyActText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  typeDot: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  typeDotText: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  activitySubject: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  activityDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  unlinkBtn: { padding: 4 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text, marginBottom: 16 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  typePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  typePillText: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase' },
  actSubject: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  actDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: Colors.background,
    marginBottom: 12,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.textSecondary },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  subjectChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  subjectChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text },
  subjectChipActiveText: { color: '#fff' },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
  },
  cancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
});
