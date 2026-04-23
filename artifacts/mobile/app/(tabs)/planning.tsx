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
const WEEK_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'] as const;
type WeekKey = typeof WEEK_KEYS[number];

const AI_PURPLE = '#7C3AED';
const AI_PURPLE_LIGHT = '#EDE9FE';

type LessonPlan = {
  id: string;
  date: string;
  description: string;
  tema: string;
  activityIds: string[];
};

type DayPlanResult = {
  tema?: string;
  objetivo: string;
  habilidade_bncc?: string;
  bncc?: { codigo: string; descricao: string };
  descritivo?: string;
  descricao?: string;
  atividade?: string;
  atividade_sugerida?: string;
};

type WeekPlanResult = Record<WeekKey, DayPlanResult>;

type GeneratedActivity = {
  titulo: string;
  descricao: string;
  tipo: 'classwork' | 'homework';
  bncc: { codigo: string; descricao: string } | null;
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

function formatDayDescription(plan: DayPlanResult): string {
  const parts: string[] = [];
  if (plan.objetivo) parts.push(`Objetivo: ${plan.objetivo}`);
  const bnccStr = plan.bncc
    ? `BNCC: ${plan.bncc.codigo} – ${plan.bncc.descricao}`
    : plan.habilidade_bncc
    ? `Habilidade BNCC: ${plan.habilidade_bncc}`
    : '';
  if (bnccStr) parts.push(bnccStr);
  const desc = plan.descricao ?? plan.descritivo ?? '';
  if (desc) parts.push(desc);
  const atv = plan.atividade ?? plan.atividade_sugerida ?? '';
  if (atv) parts.push(`Atividade: ${atv}`);
  return parts.join('\n\n');
}

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { token, teacher } = useAuth();
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
  const [newAct, setNewAct] = useState({
    description: '',
    type: 'homework' as 'homework' | 'classwork',
    subject: '',
  });
  const [creatingAct, setCreatingAct] = useState(false);

  const [descEdits, setDescEdits] = useState<Record<string, string>>({});
  const [temaEdits, setTemaEdits] = useState<Record<string, string>>({});
  const [savingDesc, setSavingDesc] = useState<Record<string, boolean>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // AI plan state
  const [aiModal, setAiModal] = useState(false);
  const [aiMode, setAiMode] = useState<'week' | 'day'>('week');
  const [aiTipo, setAiTipo] = useState<'regente' | 'disciplina'>('regente');
  const [aiSerie, setAiSerie] = useState('');
  const [aiDisciplina, setAiDisciplina] = useState('');
  const [aiTema, setAiTema] = useState('');
  const [aiDay, setAiDay] = useState<WeekKey>('segunda');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<WeekPlanResult | DayPlanResult | null>(null);
  const [aiResultModal, setAiResultModal] = useState(false);
  const [applyingAi, setApplyingAi] = useState(false);

  // AI activity state
  const [aiActModal, setAiActModal] = useState(false);
  const [aiActSerie, setAiActSerie] = useState('');
  const [aiActDisciplina, setAiActDisciplina] = useState('');
  const [aiActTema, setAiActTema] = useState('');
  const [aiActLoading, setAiActLoading] = useState(false);
  const [aiActResult, setAiActResult] = useState<GeneratedActivity | null>(null);

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
    setTemaEdits({});
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

  const getDescValue = (dateStr: string) =>
    descEdits[dateStr] !== undefined ? descEdits[dateStr] : plansByDate[dateStr]?.description ?? '';

  const getTemaValue = (dateStr: string) =>
    temaEdits[dateStr] !== undefined ? temaEdits[dateStr] : plansByDate[dateStr]?.tema ?? '';

  const scheduleSave = (dateStr: string) => {
    if (debounceTimers.current[dateStr]) clearTimeout(debounceTimers.current[dateStr]);
    debounceTimers.current[dateStr] = setTimeout(() => {
      savePlan(dateStr, getDescValue(dateStr), getTemaValue(dateStr));
    }, 1500);
  };

  const handleDescChange = (dateStr: string, text: string) => {
    setDescEdits(prev => ({ ...prev, [dateStr]: text }));
    scheduleSave(dateStr);
  };

  const handleTemaChange = (dateStr: string, text: string) => {
    setTemaEdits(prev => ({ ...prev, [dateStr]: text }));
    scheduleSave(dateStr);
  };

  const handleDescBlur = (dateStr: string) => {
    if (debounceTimers.current[dateStr]) {
      clearTimeout(debounceTimers.current[dateStr]);
      delete debounceTimers.current[dateStr];
    }
    savePlan(dateStr, getDescValue(dateStr), getTemaValue(dateStr));
    setExpandedDay(null);
  };

  const savePlan = async (dateStr: string, description: string, tema: string) => {
    if (!token) return;
    setSavingDesc(prev => ({ ...prev, [dateStr]: true }));
    try {
      const data = await apiFetch<LessonPlan>('/lesson-plans', {
        method: 'POST',
        token,
        body: JSON.stringify({ date: dateStr, description, tema }),
      });
      setPlans(prev => [...prev.filter(p => p.date !== dateStr), data]);
    } catch {
      // silent
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
        body: JSON.stringify({ date: dateStr, description: getDescValue(dateStr), tema: getTemaValue(dateStr) }),
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

  // ── AI PLAN ────────────────────────────────────────────────
  const openAiModal = (dateStr?: string) => {
    setAiResult(null);
    if (dateStr) {
      const tema = getTemaValue(dateStr);
      if (tema) setAiTema(tema);
    }
    setAiModal(true);
  };

  const handleGeneratePlan = async () => {
    if (!aiSerie.trim() || !token) {
      Alert.alert('Atenção', 'Informe a série para gerar o planejamento.');
      return;
    }
    if (aiTipo === 'disciplina' && !aiDisciplina.trim()) {
      Alert.alert('Atenção', 'Informe a disciplina.');
      return;
    }
    setAiLoading(true);
    try {
      const body: Record<string, unknown> = {
        mode: aiMode,
        serie: aiSerie.trim(),
        tipo: aiTipo,
        tema: aiTema.trim() || undefined,
      };
      if (aiTipo === 'disciplina') body.disciplina = aiDisciplina.trim();
      if (aiTipo === 'regente' && teacher?.weeklySchedule) body.weeklySchedule = teacher.weeklySchedule;
      if (aiMode === 'day') body.diaSemana = aiDay;

      const result = await apiFetch<WeekPlanResult | DayPlanResult>('/ai/generate-plan', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
      setAiResult(result);
      setAiModal(false);
      setAiResultModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o planejamento. Tente novamente.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyWeekPlan = async () => {
    if (!aiResult || aiMode !== 'week') return;
    const weekResult = aiResult as WeekPlanResult;
    setApplyingAi(true);
    try {
      await Promise.all(
        WEEK_KEYS.map((key, idx) => {
          const dayPlan = weekResult[key];
          if (!dayPlan) return null;
          const dateStr = toISO(weekDays[idx]);
          const desc = formatDayDescription(dayPlan);
          const tema = dayPlan.tema ?? '';
          setDescEdits(prev => ({ ...prev, [dateStr]: desc }));
          if (tema) setTemaEdits(prev => ({ ...prev, [dateStr]: tema }));
          return savePlan(dateStr, desc, tema);
        }).filter(Boolean)
      );
      setAiResultModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Erro', 'Não foi possível aplicar o planejamento.');
    } finally {
      setApplyingAi(false);
    }
  };

  const handleApplyDayPlan = async () => {
    if (!aiResult || aiMode !== 'day') return;
    const dayResult = aiResult as DayPlanResult;
    const dayIdx = WEEK_KEYS.indexOf(aiDay);
    if (dayIdx === -1) return;
    const dateStr = toISO(weekDays[dayIdx]);
    const desc = formatDayDescription(dayResult);
    const tema = dayResult.tema ?? '';
    setDescEdits(prev => ({ ...prev, [dateStr]: desc }));
    if (tema) setTemaEdits(prev => ({ ...prev, [dateStr]: tema }));
    await savePlan(dateStr, desc, tema);
    setAiResultModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── AI ACTIVITY ────────────────────────────────────────────
  const openAiActModal = (dateStr: string) => {
    setActiveDayDate(dateStr);
    setAiActResult(null);
    setAiActTema(getTemaValue(dateStr));
    setAiActModal(true);
  };

  const handleGenerateActivity = async () => {
    if (!aiActDisciplina.trim() || !aiActTema.trim() || !token) {
      Alert.alert('Atenção', 'Informe a disciplina e o tema da atividade.');
      return;
    }
    setAiActLoading(true);
    try {
      const result = await apiFetch<GeneratedActivity>('/ai/generate-activity', {
        method: 'POST',
        token,
        body: JSON.stringify({
          serie: aiActSerie.trim() || undefined,
          disciplina: aiActDisciplina.trim(),
          tema: aiActTema.trim(),
        }),
      });
      setAiActResult(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar a atividade. Tente novamente.');
    } finally {
      setAiActLoading(false);
    }
  };

  const applyGeneratedActivity = () => {
    if (!aiActResult) return;
    const desc = [
      aiActResult.titulo ? `${aiActResult.titulo}\n` : '',
      aiActResult.descricao,
      aiActResult.bncc ? `\nBNCC: ${aiActResult.bncc.codigo} – ${aiActResult.bncc.descricao}` : '',
    ].filter(Boolean).join('');
    setNewAct({
      subject: aiActDisciplina,
      type: aiActResult.tipo,
      description: desc,
    });
    setAiActModal(false);
    setAiActResult(null);
    setCreateModal(true);
  };

  // ── Misc ───────────────────────────────────────────────────
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

  const weekResultEntries = useMemo(() => {
    if (!aiResult || aiMode !== 'week') return [];
    const wr = aiResult as WeekPlanResult;
    return WEEK_KEYS.map((key, idx) => ({ key, label: WEEKDAY_PT[idx], plan: wr[key] })).filter(e => !!e.plan);
  }, [aiResult, aiMode]);

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

      {/* AI Plan Button */}
      <TouchableOpacity style={styles.aiBtn} onPress={() => openAiModal()} activeOpacity={0.85}>
        <Ionicons name="sparkles" size={15} color={AI_PURPLE} />
        <Text style={styles.aiBtnText}>Gerar planejamento com IA</Text>
      </TouchableOpacity>

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
          const tema = getTemaValue(dateStr);
          const isToday = dateStr === todayISO;
          const dayName = WEEKDAY_PT[idx];
          const dayNum = day.getDate();
          const isSaving = savingDesc[dateStr];
          const linkedActivities = plan
            ? plan.activityIds.map(id => activities.find(a => a.id === id)).filter(Boolean) as Activity[]
            : [];

          return (
            <View key={dateStr} style={[styles.card, isToday && styles.cardToday]}>
              {/* Card header */}
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
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Tema da aula */}
              <View style={styles.fieldBlock}>
                <Text style={styles.sectionLabel}>Tema da aula</Text>
                <TextInput
                  style={styles.temaInput}
                  value={tema}
                  onChangeText={text => handleTemaChange(dateStr, text)}
                  placeholder="Ex: Folclore, Frações, Primavera..."
                  placeholderTextColor={Colors.textTertiary}
                  returnKeyType="done"
                />
              </View>

              {/* Descritivo */}
              <View style={styles.fieldBlock}>
                <Text style={styles.sectionLabel}>Descritivo</Text>
                {expandedDay === dateStr ? (
                  <TextInput
                    style={[styles.descInput, styles.descInputExpanded]}
                    value={desc}
                    onChangeText={text => handleDescChange(dateStr, text)}
                    onBlur={() => handleDescBlur(dateStr)}
                    placeholder="nada planejado"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                    textAlignVertical="top"
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => setExpandedDay(dateStr)}
                    activeOpacity={0.7}
                    style={styles.descCollapsed}
                  >
                    <Text
                      style={[styles.descText, !desc && styles.descPlaceholder]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {desc || 'toque para escrever...'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action buttons row */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => { setActiveDayDate(dateStr); setLinkModal(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={13} color={Colors.primary} />
                  <Text style={styles.actionBtnText}>Atividade</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnAi]}
                  onPress={() => openAiActModal(dateStr)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={13} color={AI_PURPLE} />
                  <Text style={[styles.actionBtnText, { color: AI_PURPLE }]}>Gerar atividade com IA</Text>
                </TouchableOpacity>
              </View>

              {/* Linked Activities */}
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

      {/* ── Link Existing Activity Modal ─────────────────── */}
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

      {/* ── Create New Activity Modal ─────────────────────── */}
      <Modal visible={createModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setCreateModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <View style={[modal.sheet, { paddingBottom: insets.bottom + 16 }]}>
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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── AI Plan Config Modal ──────────────────────────── */}
      <Modal visible={aiModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => !aiLoading && setAiModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <View style={[modal.sheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={modal.handle} />
              <View style={ai.header}>
                <View style={ai.headerIcon}>
                  <Ionicons name="sparkles" size={18} color={AI_PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ai.headerTitle}>Gerar planejamento</Text>
                  <Text style={ai.headerSub}>Planejamento pedagógico baseado na BNCC</Text>
                </View>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={ai.label}>Período</Text>
                <View style={modal.typeRow}>
                  <TouchableOpacity
                    style={[modal.typeBtn, aiMode === 'week' && { borderColor: AI_PURPLE, backgroundColor: AI_PURPLE_LIGHT }]}
                    onPress={() => setAiMode('week')} activeOpacity={0.8}
                  >
                    <Text style={[modal.typeBtnText, aiMode === 'week' && { color: AI_PURPLE }]}>Semana inteira</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modal.typeBtn, aiMode === 'day' && { borderColor: AI_PURPLE, backgroundColor: AI_PURPLE_LIGHT }]}
                    onPress={() => setAiMode('day')} activeOpacity={0.8}
                  >
                    <Text style={[modal.typeBtnText, aiMode === 'day' && { color: AI_PURPLE }]}>Dia específico</Text>
                  </TouchableOpacity>
                </View>

                {aiMode === 'day' && (
                  <>
                    <Text style={ai.label}>Dia da semana</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {WEEK_KEYS.map((key, idx) => (
                          <TouchableOpacity
                            key={key}
                            style={[modal.chip, aiDay === key && { backgroundColor: AI_PURPLE, borderColor: AI_PURPLE }]}
                            onPress={() => setAiDay(key)} activeOpacity={0.8}
                          >
                            <Text style={[modal.chipText, aiDay === key && { color: '#fff' }]}>{WEEKDAY_PT[idx]}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                )}

                <Text style={ai.label}>Tipo de professor</Text>
                <View style={modal.typeRow}>
                  <TouchableOpacity
                    style={[modal.typeBtn, aiTipo === 'regente' && { borderColor: AI_PURPLE, backgroundColor: AI_PURPLE_LIGHT }]}
                    onPress={() => setAiTipo('regente')} activeOpacity={0.8}
                  >
                    <Text style={[modal.typeBtnText, aiTipo === 'regente' && { color: AI_PURPLE }]}>Regente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modal.typeBtn, aiTipo === 'disciplina' && { borderColor: AI_PURPLE, backgroundColor: AI_PURPLE_LIGHT }]}
                    onPress={() => setAiTipo('disciplina')} activeOpacity={0.8}
                  >
                    <Text style={[modal.typeBtnText, aiTipo === 'disciplina' && { color: AI_PURPLE }]}>Disciplina</Text>
                  </TouchableOpacity>
                </View>

                {aiTipo === 'disciplina' && (
                  <>
                    <Text style={ai.label}>Disciplina</Text>
                    <TextInput
                      style={modal.input}
                      placeholder="ex: Matemática, Português..."
                      placeholderTextColor={Colors.textTertiary}
                      value={aiDisciplina}
                      onChangeText={setAiDisciplina}
                    />
                  </>
                )}

                <Text style={ai.label}>Série / Ano</Text>
                <TextInput
                  style={modal.input}
                  placeholder="ex: 3º ano, 5º ano..."
                  placeholderTextColor={Colors.textTertiary}
                  value={aiSerie}
                  onChangeText={setAiSerie}
                />

                <Text style={ai.label}>
                  Tema / Contexto{' '}
                  <Text style={{ color: Colors.textTertiary, fontFamily: 'Inter_400Regular' }}>(opcional)</Text>
                </Text>
                <TextInput
                  style={modal.input}
                  placeholder="ex: Primavera, Folclore, Geometria..."
                  placeholderTextColor={Colors.textTertiary}
                  value={aiTema}
                  onChangeText={setAiTema}
                />
              </ScrollView>

              <View style={modal.btnRow}>
                <TouchableOpacity style={modal.closeBtn} onPress={() => setAiModal(false)} disabled={aiLoading} activeOpacity={0.8}>
                  <Text style={modal.closeBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ai.generateBtn, aiLoading && { opacity: 0.7 }]}
                  onPress={handleGeneratePlan}
                  disabled={aiLoading}
                  activeOpacity={0.85}
                >
                  {aiLoading
                    ? <><ActivityIndicator size="small" color="#fff" /><Text style={ai.generateBtnText}>Gerando...</Text></>
                    : <><Ionicons name="sparkles" size={15} color="#fff" /><Text style={ai.generateBtnText}>Gerar</Text></>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── AI Plan Result Modal ──────────────────────────── */}
      <Modal visible={aiResultModal} transparent animationType="slide">
        <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => !applyingAi && setAiResultModal(false)}>
          <View style={[modal.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '90%' }]} onStartShouldSetResponder={() => true}>
            <View style={modal.handle} />
            <View style={ai.header}>
              <View style={ai.headerIcon}>
                <Ionicons name="sparkles" size={18} color={AI_PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ai.headerTitle}>Planejamento gerado</Text>
                <Text style={ai.headerSub}>Revise e aplique ao seu calendário</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {aiMode === 'week' && weekResultEntries.map(({ key, label, plan }) => (
                <View key={key} style={ai.resultCard}>
                  <Text style={ai.resultDay}>{label}</Text>
                  {plan.tema ? <Text style={ai.resultText}><Text style={ai.resultLabel}>Tema: </Text>{plan.tema}</Text> : null}
                  {plan.objetivo ? <Text style={ai.resultText}><Text style={ai.resultLabel}>Objetivo: </Text>{plan.objetivo}</Text> : null}
                  {(plan.bncc?.codigo || plan.habilidade_bncc) ? (
                    <Text style={ai.resultText}>
                      <Text style={ai.resultLabel}>BNCC: </Text>
                      {plan.bncc ? `${plan.bncc.codigo} – ${plan.bncc.descricao}` : plan.habilidade_bncc}
                    </Text>
                  ) : null}
                  {(plan.descricao ?? plan.descritivo) ? <Text style={ai.resultText}><Text style={ai.resultLabel}>Descritivo: </Text>{plan.descricao ?? plan.descritivo}</Text> : null}
                  {(plan.atividade ?? plan.atividade_sugerida) ? <Text style={ai.resultText}><Text style={ai.resultLabel}>Atividade: </Text>{plan.atividade ?? plan.atividade_sugerida}</Text> : null}
                </View>
              ))}

              {aiMode === 'day' && aiResult && (() => {
                const plan = aiResult as DayPlanResult;
                return (
                  <View style={ai.resultCard}>
                    <Text style={ai.resultDay}>{WEEKDAY_PT[WEEK_KEYS.indexOf(aiDay)]}</Text>
                    {plan.tema ? <Text style={ai.resultText}><Text style={ai.resultLabel}>Tema: </Text>{plan.tema}</Text> : null}
                    {plan.objetivo ? <Text style={ai.resultText}><Text style={ai.resultLabel}>Objetivo: </Text>{plan.objetivo}</Text> : null}
                    {(plan.bncc?.codigo || plan.habilidade_bncc) ? (
                      <Text style={ai.resultText}>
                        <Text style={ai.resultLabel}>BNCC: </Text>
                        {plan.bncc ? `${plan.bncc.codigo} – ${plan.bncc.descricao}` : plan.habilidade_bncc}
                      </Text>
                    ) : null}
                    {(plan.descricao ?? plan.descritivo) ? <Text style={ai.resultText}><Text style={ai.resultLabel}>Descritivo: </Text>{plan.descricao ?? plan.descritivo}</Text> : null}
                    {(plan.atividade ?? plan.atividade_sugerida) ? <Text style={ai.resultText}><Text style={ai.resultLabel}>Atividade: </Text>{plan.atividade ?? plan.atividade_sugerida}</Text> : null}
                  </View>
                );
              })()}
            </ScrollView>

            <View style={modal.btnRow}>
              <TouchableOpacity style={modal.closeBtn} onPress={() => setAiResultModal(false)} disabled={applyingAi} activeOpacity={0.8}>
                <Text style={modal.closeBtnText}>Descartar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ai.generateBtn, applyingAi && { opacity: 0.7 }]}
                onPress={aiMode === 'week' ? handleApplyWeekPlan : handleApplyDayPlan}
                disabled={applyingAi}
                activeOpacity={0.85}
              >
                {applyingAi
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="checkmark-circle" size={16} color="#fff" /><Text style={ai.generateBtnText}>Aplicar</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── AI Activity Modal ─────────────────────────────── */}
      <Modal visible={aiActModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => !aiActLoading && setAiActModal(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <View style={[modal.sheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={modal.handle} />
              <View style={ai.header}>
                <View style={ai.headerIcon}>
                  <Ionicons name="flash" size={18} color={AI_PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ai.headerTitle}>Gerar atividade com IA</Text>
                  <Text style={ai.headerSub}>Crie atividades alinhadas à BNCC</Text>
                </View>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Se já tiver resultado, mostra o resultado */}
                {aiActResult ? (
                  <View style={ai.actResultCard}>
                    <View style={ai.actResultHeader}>
                      <View style={[modal.pill, { backgroundColor: aiActResult.tipo === 'homework' ? Colors.homeworkLight : Colors.classworkLight }]}>
                        <Text style={[modal.pillText, { color: aiActResult.tipo === 'homework' ? Colors.homework : Colors.classwork }]}>
                          {aiActResult.tipo === 'homework' ? 'Para casa' : 'Em sala'}
                        </Text>
                      </View>
                    </View>
                    {aiActResult.titulo ? (
                      <Text style={ai.actResultTitle}>{aiActResult.titulo}</Text>
                    ) : null}
                    {aiActResult.descricao ? (
                      <Text style={ai.resultText}>{aiActResult.descricao}</Text>
                    ) : null}
                    {aiActResult.bncc ? (
                      <Text style={[ai.resultText, { marginTop: 6 }]}>
                        <Text style={ai.resultLabel}>BNCC: </Text>
                        {aiActResult.bncc.codigo} – {aiActResult.bncc.descricao}
                      </Text>
                    ) : null}
                    <View style={[modal.btnRow, { marginTop: 14 }]}>
                      <TouchableOpacity
                        style={modal.closeBtn}
                        onPress={() => setAiActResult(null)}
                        activeOpacity={0.8}
                      >
                        <Text style={modal.closeBtnText}>Refazer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={ai.generateBtn}
                        onPress={applyGeneratedActivity}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={ai.generateBtnText}>Usar atividade</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={ai.label}>Disciplina</Text>
                    <TextInput
                      style={modal.input}
                      placeholder="ex: Matemática, Português, Ciências..."
                      placeholderTextColor={Colors.textTertiary}
                      value={aiActDisciplina}
                      onChangeText={setAiActDisciplina}
                    />

                    <Text style={ai.label}>Tema da atividade</Text>
                    <TextInput
                      style={modal.input}
                      placeholder="ex: Adição, Leitura, Fotossíntese..."
                      placeholderTextColor={Colors.textTertiary}
                      value={aiActTema}
                      onChangeText={setAiActTema}
                    />

                    <Text style={ai.label}>
                      Série / Ano{' '}
                      <Text style={{ color: Colors.textTertiary, fontFamily: 'Inter_400Regular' }}>(opcional)</Text>
                    </Text>
                    <TextInput
                      style={modal.input}
                      placeholder="ex: 3º ano, 5º ano..."
                      placeholderTextColor={Colors.textTertiary}
                      value={aiActSerie}
                      onChangeText={setAiActSerie}
                    />

                    <View style={modal.btnRow}>
                      <TouchableOpacity style={modal.closeBtn} onPress={() => setAiActModal(false)} disabled={aiActLoading} activeOpacity={0.8}>
                        <Text style={modal.closeBtnText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[ai.generateBtn, aiActLoading && { opacity: 0.7 }]}
                        onPress={handleGenerateActivity}
                        disabled={aiActLoading}
                        activeOpacity={0.85}
                      >
                        {aiActLoading
                          ? <><ActivityIndicator size="small" color="#fff" /><Text style={ai.generateBtnText}>Gerando...</Text></>
                          : <><Ionicons name="flash" size={15} color="#fff" /><Text style={ai.generateBtnText}>Gerar atividade</Text></>
                        }
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  monthHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  monthCenter: { flex: 1, alignItems: 'center' },
  monthTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  monthSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  weekNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  weekArrow: { padding: 6 },
  weekLabel: {
    flex: 1, textAlign: 'center',
    fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text,
  },

  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, marginHorizontal: 14, marginTop: 12, marginBottom: 2,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: AI_PURPLE_LIGHT,
    borderWidth: 1.5, borderColor: AI_PURPLE + '40',
  },
  aiBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: AI_PURPLE },

  scroll: { paddingHorizontal: 14, paddingTop: 12, gap: 12 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 14, gap: 10,
  },
  cardToday: { borderColor: Colors.primary },

  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  todayDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary },
  dayName: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text },

  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  actionBtnAi: { backgroundColor: AI_PURPLE_LIGHT },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.primary,
  },

  divider: { height: 1, backgroundColor: Colors.borderLight },

  fieldBlock: { gap: 5 },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 10,
    color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  temaInput: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: Colors.background,
  },
  descInput: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
    lineHeight: 20, minHeight: 52, paddingTop: 2,
  },
  descInputExpanded: {
    minHeight: 72, borderWidth: 1, borderColor: Colors.primary + '55',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: Colors.primary + '08',
  },
  descCollapsed: { paddingVertical: 4, paddingHorizontal: 2, minHeight: 36 },
  descText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, lineHeight: 20 },
  descPlaceholder: { color: Colors.textTertiary },

  activitiesBlock: {
    gap: 6, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  actRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 2 },
  actName: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.text, lineHeight: 18 },
  actLink: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.primary },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
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
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
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
    padding: 12, backgroundColor: Colors.background, marginBottom: 14,
  },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  confirmBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  confirmText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
});

const ai = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: AI_PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text, marginBottom: 8 },
  generateBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: AI_PURPLE, marginTop: 12,
  },
  generateBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
  resultCard: {
    backgroundColor: AI_PURPLE_LIGHT, borderRadius: 14, padding: 14,
    marginBottom: 10, gap: 6, borderWidth: 1, borderColor: AI_PURPLE + '25',
  },
  resultDay: { fontFamily: 'Inter_700Bold', fontSize: 15, color: AI_PURPLE, marginBottom: 4 },
  resultLabel: { fontFamily: 'Inter_600SemiBold', color: Colors.text },
  resultText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, lineHeight: 19 },
  actResultCard: {
    backgroundColor: AI_PURPLE_LIGHT, borderRadius: 14, padding: 14,
    gap: 8, borderWidth: 1, borderColor: AI_PURPLE + '25',
  },
  actResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actResultTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text },
});
