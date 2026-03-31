import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useApp, Activity } from '@/context/AppContext';
import { apiFetch } from '@/utils/api';
import { toISO, getBrasiliaDate } from '@/utils/date';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAY_PT = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

type LessonPlan = {
  id: string;
  date: string;
  description: string;
  activityIds: string[];
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
}

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { activities, addActivity } = useApp();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const [monday, setMonday] = useState(() => getMonday(getBrasiliaDate()));
  const weekDays = useMemo(() => getWeekDays(monday), [monday]);

  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeDayDate, setActiveDayDate] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newAct, setNewAct] = useState({ description: '', type: 'homework' as 'homework' | 'classwork', subject: '' });
  const [creatingAct, setCreatingAct] = useState(false);

  const [descEdits, setDescEdits] = useState<Record<string, string>>({});
  const [savingDesc, setSavingDesc] = useState<Record<string, boolean>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const mondayISO = toISO(monday);

  const fetchPlans = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const months = new Set<string>();
      getWeekDays(monday).forEach(d => {
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      });
      const results = await Promise.all(
        Array.from(months).map(m => apiFetch<LessonPlan[]>(`/lesson-plans?month=${m}`, { token }))
      );
      setPlans(results.flat());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, mondayISO]);

  useEffect(() => {
    fetchPlans();
    setDescEdits({});
  }, [fetchPlans]);

  const plansByDate = useMemo(() => {
    const map: Record<string, LessonPlan> = {};
    plans.forEach(p => { map[p.date] = p; });
    return map;
  }, [plans]);

  const goToPrevWeek = () => setMonday(m => addDays(m, -7));
  const goToNextWeek = () => setMonday(m => addDays(m, 7));
  const goToPrevMonth = () => {
    const d = new Date(monday);
    d.setMonth(d.getMonth() - 1);
    setMonday(getMonday(d));
  };
  const goToNextMonth = () => {
    const d = new Date(monday);
    d.setMonth(d.getMonth() + 1);
    setMonday(getMonday(d));
  };

  const getDescValue = (dateStr: string): string => {
    if (descEdits[dateStr] !== undefined) return descEdits[dateStr];
    return plansByDate[dateStr]?.description ?? '';
  };

  const handleDescChange = (dateStr: string, text: string) => {
    setDescEdits(prev => ({ ...prev, [dateStr]: text }));
    if (debounceTimers.current[dateStr]) clearTimeout(debounceTimers.current[dateStr]);
    debounceTimers.current[dateStr] = setTimeout(() => saveDescription(dateStr, text), 1500);
  };

  const saveDescription = async (dateStr: string, text: string) => {
    if (!token) return;
    setSavingDesc(prev => ({ ...prev, [dateStr]: true }));
    try {
      const data = await apiFetch<LessonPlan>('/lesson-plans', {
        method: 'POST',
        token,
        body: JSON.stringify({ date: dateStr, description: text }),
      });
      setPlans(prev => {
        const filtered = prev.filter(p => p.date !== dateStr);
        return [...filtered, data];
      });
    } catch {
      // silent auto-save failure
    } finally {
      setSavingDesc(prev => ({ ...prev, [dateStr]: false }));
    }
  };

  const ensurePlan = async (dateStr: string): Promise<string | null> => {
    const existing = plansByDate[dateStr];
    if (existing) return existing.id;
    if (!token) return null;
    try {
      const data = await apiFetch<LessonPlan>('/lesson-plans', {
        method: 'POST',
        token,
        body: JSON.stringify({ date: dateStr, description: getDescValue(dateStr) }),
      });
      setPlans(prev => [...prev.filter(p => p.date !== dateStr), data]);
      return data.id;
    } catch {
      return null;
    }
  };

  const handleLinkActivity = async (activityId: string) => {
    if (!activeDayDate || !token) return;
    const planId = await ensurePlan(activeDayDate);
    if (!planId) { Alert.alert('Erro', 'Não foi possível criar o planejamento.'); return; }
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

  const handleUnlink = async (dateStr: string, activityId: string) => {
    const plan = plansByDate[dateStr];
    if (!plan || !token) return;
    try {
      await apiFetch(`/lesson-plans/${plan.id}/activities/${activityId}`, { method: 'DELETE', token });
      setPlans(prev => prev.map(p => p.id === plan.id
        ? { ...p, activityIds: p.activityIds.filter(id => id !== activityId) }
        : p
      ));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Erro', 'Não foi possível desassociar.');
    }
  };

  const handleCreateAndLink = async () => {
    if (!activeDayDate || !newAct.description.trim() || !token) return;
    setCreatingAct(true);
    try {
      const created = await addActivity({
        subject: newAct.subject || (activities[0]?.subject ?? 'Geral'),
        type: newAct.type,
        description: newAct.description,
        date: activeDayDate,
      });
      if (created) await handleLinkActivity(created.id);
      setCreateModal(false);
      setNewAct({ description: '', type: 'homework', subject: '' });
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a atividade.');
    } finally {
      setCreatingAct(false);
    }
  };

  const subjects = useMemo(() => Array.from(new Set(activities.map(a => a.subject))), [activities]);
  const todayISO = useMemo(() => toISO(getBrasiliaDate()), []);
  const displayMonth = monday.getMonth();
  const displayYear = monday.getFullYear();
  const mondayDay = monday.getDate();
  const fridayDay = weekDays[4].getDate();
  const weekLabel = `Semana ${mondayDay} — ${fridayDay}`;
  const monthStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`;
  const monthPlansCount = plans.filter(p => p.date.startsWith(monthStr)).length;

  const availableToLink = useMemo(() => {
    if (!activeDayDate) return activities;
    const linked = new Set(plansByDate[activeDayDate]?.activityIds ?? []);
    return activities.filter(a => !linked.has(a.id));
  }, [activities, activeDayDate, plansByDate]);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={goToPrevMonth} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text style={styles.monthTitle}>{MONTH_NAMES[displayMonth]} {displayYear}</Text>
          {loading
            ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 2 }} />
            : <Text style={styles.monthSub}>{monthPlansCount} dia(s) com planejamento</Text>
          }
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={goToNextMonth} activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.weekArrow} onPress={goToPrevWeek} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <TouchableOpacity style={styles.weekArrow} onPress={goToNextWeek} activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Day Cards */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {weekDays.map((day, idx) => {
          const dateStr = toISO(day);
          const plan = plansByDate[dateStr];
          const desc = getDescValue(dateStr);
          const isToday = dateStr === todayISO;
          const dayName = WEEKDAY_PT[idx];
          const dayNum = day.getDate();
          const isSaving = savingDesc[dateStr];
          const linkedActivities = plan
            ? plan.activityIds.map(id => activities.find(a => a.id === id)).filter(Boolean) as Activity[]
            : [];

          return (
            <View key={dateStr} style={[styles.card, isToday && styles.cardToday]}>
              {/* Card header row */}
              <View style={styles.cardHeader}>
                <View style={styles.dayLabelWrap}>
                  {isToday && <View style={styles.todayDot} />}
                  <Text style={[styles.dayName, isToday && { color: Colors.primary }]}>
                    {dayName} — {dayNum}
                  </Text>
                  {isSaving && (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 6 }} />
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => { setActiveDayDate(dateStr); setLinkModal(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={13} color={Colors.primary} />
                  <Text style={styles.addBtnText}>Adicionar atividade</Text>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Description */}
              <View style={styles.descBlock}>
                <Text style={styles.sectionLabel}>descritivo</Text>
                <TextInput
                  style={styles.descInput}
                  value={desc}
                  onChangeText={text => handleDescChange(dateStr, text)}
                  placeholder="nada planejado"
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Activities */}
              {linkedActivities.length > 0 && (
                <View style={styles.activitiesBlock}>
                  <Text style={styles.sectionLabel}>Atividades relacionadas</Text>
                  {linkedActivities.map(act => (
                    <View key={act.id} style={styles.actRow}>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={styles.actName} numberOfLines={2}>
                          {act.subject} — {act.description}
                        </Text>
                        {act.link ? (
                          <Text style={styles.actLink} numberOfLines={1}>{act.link}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleUnlink(dateStr, act.id)}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Link Existing Activity Modal */}
      <Modal visible={linkModal} transparent animationType="slide">
        <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setLinkModal(false)}>
          <View style={[modal.sheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={modal.handle} />
            <View style={modal.titleRow}>
              <Text style={modal.title}>Adicionar atividade</Text>
              <TouchableOpacity
                onPress={() => { setLinkModal(false); setCreateModal(true); }}
                activeOpacity={0.8}
              >
                <Text style={modal.createLink}>+ Criar nova</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              {availableToLink.length === 0 ? (
                <Text style={modal.emptyText}>Nenhuma atividade disponível para associar.</Text>
              ) : (
                availableToLink.map(a => (
                  <TouchableOpacity key={a.id} style={modal.actRow} onPress={() => handleLinkActivity(a.id)} activeOpacity={0.8}>
                    <View style={[modal.pill, { backgroundColor: a.type === 'homework' ? Colors.homeworkLight : Colors.classworkLight }]}>
                      <Text style={[modal.pillText, { color: a.type === 'homework' ? Colors.homework : Colors.classwork }]}>
                        {a.type === 'homework' ? 'Casa' : 'Sala'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={modal.actSubject}>{a.subject}</Text>
                      <Text style={modal.actDesc} numberOfLines={1}>{a.description}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={modal.closeBtn} onPress={() => setLinkModal(false)} activeOpacity={0.8}>
              <Text style={modal.closeBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create New Activity Modal */}
      <Modal visible={createModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setCreateModal(false)}>
            <View style={[modal.sheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
              <View style={modal.handle} />
              <Text style={modal.title}>Nova atividade</Text>
              {subjects.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {subjects.map(sub => (
                      <TouchableOpacity
                        key={sub}
                        style={[modal.chip, newAct.subject === sub && modal.chipActive]}
                        onPress={() => setNewAct(a => ({ ...a, subject: sub }))}
                        activeOpacity={0.8}
                      >
                        <Text style={[modal.chipText, newAct.subject === sub && modal.chipActiveText]}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
              <View style={modal.typeRow}>
                <TouchableOpacity
                  style={[modal.typeBtn, newAct.type === 'homework' && { borderColor: Colors.homework, backgroundColor: Colors.homeworkLight }]}
                  onPress={() => setNewAct(a => ({ ...a, type: 'homework' }))}
                  activeOpacity={0.8}
                >
                  <Text style={[modal.typeBtnText, newAct.type === 'homework' && { color: Colors.homework }]}>Para casa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modal.typeBtn, newAct.type === 'classwork' && { borderColor: Colors.primary, backgroundColor: Colors.primaryLight }]}
                  onPress={() => setNewAct(a => ({ ...a, type: 'classwork' }))}
                  activeOpacity={0.8}
                >
                  <Text style={[modal.typeBtnText, newAct.type === 'classwork' && { color: Colors.primary }]}>Em sala</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[modal.input, { minHeight: 90, textAlignVertical: 'top' }]}
                placeholder="Descrição da atividade..."
                placeholderTextColor={Colors.textTertiary}
                value={newAct.description}
                onChangeText={t => setNewAct(a => ({ ...a, description: t }))}
                multiline
                autoFocus
              />
              <View style={modal.btnRow}>
                <TouchableOpacity style={modal.closeBtn} onPress={() => setCreateModal(false)} activeOpacity={0.8}>
                  <Text style={modal.closeBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modal.confirmBtn, (!newAct.description.trim() || creatingAct) && { opacity: 0.5 }]}
                  onPress={handleCreateAndLink}
                  disabled={!newAct.description.trim() || creatingAct}
                  activeOpacity={0.85}
                >
                  {creatingAct
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={modal.confirmText}>Criar e associar</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: { flex: 1, alignItems: 'center' },
  monthTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  monthSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weekArrow: { padding: 6 },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },

  scroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 12,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  cardToday: {
    borderColor: Colors.primary,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  todayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  dayName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: Colors.text,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  addBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.primary,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },

  descBlock: { gap: 4 },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  descInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    minHeight: 52,
    paddingTop: 2,
  },

  activitiesBlock: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 2,
  },
  actName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  actLink: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.primary,
  },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  createLink: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.primary },
  emptyText: {
    fontFamily: 'Inter_400Regular', fontSize: 14,
    color: Colors.textSecondary, textAlign: 'center', paddingVertical: 20,
  },
  actRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase' },
  actSubject: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  actDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  closeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary, alignItems: 'center', marginTop: 12,
  },
  closeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  typeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.textSecondary },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1.5, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text },
  chipActiveText: { color: '#fff' },
  input: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.text,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    padding: 12, backgroundColor: Colors.background, marginBottom: 12,
  },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  confirmBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  confirmText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
});
