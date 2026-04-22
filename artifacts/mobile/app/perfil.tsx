import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth, type WeeklySchedule, type DayEntry } from '@/context/AuthContext';

const DAYS: { key: keyof WeeklySchedule; label: string }[] = [
  { key: 'segunda', label: 'Segunda-feira' },
  { key: 'terca', label: 'Terça-feira' },
  { key: 'quarta', label: 'Quarta-feira' },
  { key: 'quinta', label: 'Quinta-feira' },
  { key: 'sexta', label: 'Sexta-feira' },
];

const SUBJECT_SUGGESTIONS = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Artes', 'Educação Física', 'Inglês', 'Religião', 'Informática',
];

const EMPTY_SCHEDULE: WeeklySchedule = {
  segunda: [], terca: [], quarta: [], quinta: [], sexta: [],
};

function scheduleIsEmpty(s: WeeklySchedule) {
  return DAYS.every(d => s[d.key].length === 0);
}

type DayEditorProps = {
  day: { key: keyof WeeklySchedule; label: string };
  entries: DayEntry[];
  onChange: (entries: DayEntry[]) => void;
};

function DayEntryRow({ entry, onRemove }: { entry: DayEntry; onRemove: () => void }) {
  return (
    <View style={st.chip}>
      <Text style={st.chipSubject}>{entry.subject}</Text>
      {entry.turma ? <Text style={st.chipTurma}> · {entry.turma}</Text> : null}
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }} style={{ marginLeft: 4 }}>
        <Ionicons name="close" size={12} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function DayEditor({ day, entries, onChange }: DayEditorProps) {
  const [subject, setSubject] = useState('');
  const [turma, setTurma] = useState('');
  const [showTurma, setShowTurma] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const subjectRef = useRef<TextInput>(null);

  const filtered = SUBJECT_SUGGESTIONS.filter(
    s => !entries.some(e => e.subject.toLowerCase() === s.toLowerCase())
      && s.toLowerCase().includes(subject.toLowerCase())
  );

  const addEntry = () => {
    const s = subject.trim();
    if (!s) return;
    const entry: DayEntry = { subject: s, ...(turma.trim() ? { turma: turma.trim() } : {}) };
    onChange([...entries, entry]);
    setSubject('');
    setTurma('');
    setShowTurma(false);
    setShowSuggestions(false);
  };

  return (
    <View style={st.dayBlock}>
      <Text style={st.dayLabel}>{day.label}</Text>

      {entries.length > 0 && (
        <View style={st.chipsRow}>
          {entries.map((e, i) => (
            <DayEntryRow key={i} entry={e} onRemove={() => onChange(entries.filter((_, j) => j !== i))} />
          ))}
        </View>
      )}

      <View style={st.inputRow}>
        <TextInput
          ref={subjectRef}
          style={[st.inputSmall, { flex: 1 }]}
          value={subject}
          onChangeText={t => { setSubject(t); setShowSuggestions(t.length > 0); }}
          placeholder="Matéria..."
          placeholderTextColor={Colors.textTertiary}
          returnKeyType={showTurma ? 'next' : 'done'}
          onSubmitEditing={showTurma ? undefined : addEntry}
          blurOnSubmit={!showTurma}
        />
        <TouchableOpacity
          style={[st.turmaToggle, showTurma && st.turmaToggleActive]}
          onPress={() => setShowTurma(v => !v)}
          activeOpacity={0.8}
        >
          <Text style={[st.turmaToggleText, showTurma && { color: Colors.primary }]}>+Turma</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.addBtn, !subject.trim() && { opacity: 0.4 }]}
          onPress={addEntry}
          disabled={!subject.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {showTurma && (
        <TextInput
          style={st.inputSmall}
          value={turma}
          onChangeText={setTurma}
          placeholder="Turma (ex: 4º A, 3º B)..."
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="done"
          onSubmitEditing={addEntry}
          autoFocus
        />
      )}

      {showSuggestions && filtered.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {filtered.slice(0, 5).map(s => (
              <TouchableOpacity
                key={s}
                style={st.suggestion}
                onPress={() => { setSubject(s); setShowSuggestions(false); subjectRef.current?.focus(); }}
                activeOpacity={0.8}
              >
                <Text style={st.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { teacher, updateProfile } = useAuth();
  const [name, setName] = useState(teacher?.name ?? '');
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    teacher?.weeklySchedule ?? EMPTY_SCHEDULE
  );
  const [saving, setSaving] = useState(false);
  const [gradeExpanded, setGradeExpanded] = useState(false);

  const topPadding = Platform.OS === 'web' ? 40 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 40 : insets.bottom;

  const hasNameChange = name.trim() !== '' && name.trim() !== teacher?.name;
  const hasScheduleChange = JSON.stringify(schedule) !== JSON.stringify(teacher?.weeklySchedule ?? EMPTY_SCHEDULE);
  const hasChanges = hasNameChange || hasScheduleChange;

  const handleSave = async () => {
    if (!name.trim() || !hasChanges) {
      if (!hasChanges) Alert.alert('Sem alterações', 'Nenhuma informação foi modificada.');
      return;
    }
    setSaving(true);
    try {
      const scheduleToSave = scheduleIsEmpty(schedule) ? null : schedule;
      await updateProfile(name.trim(), scheduleToSave);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível atualizar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const updateDayEntries = (key: keyof WeeklySchedule, entries: DayEntry[]) => {
    setSchedule(prev => ({ ...prev, [key]: entries }));
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topPadding }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(name[0] ?? teacher?.name?.[0] ?? '?').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.avatarName}>{teacher?.name}</Text>
          <Text style={styles.avatarEmail}>{teacher?.email}</Text>
        </View>

        {/* Informações pessoais */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informações pessoais</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nome completo</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Seu nome completo"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <View style={[styles.inputContainer, styles.inputReadonly]}>
              <Ionicons name="mail-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
              <Text style={[styles.input, styles.readonlyText]} numberOfLines={1}>
                {teacher?.email}
              </Text>
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed" size={12} color={Colors.textTertiary} />
              </View>
            </View>
            <Text style={styles.hint}>O e-mail não pode ser alterado</Text>
          </View>
        </View>

        {/* Grade Semanal */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.gradeHeader}
            onPress={() => setGradeExpanded(v => !v)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Grade Semanal</Text>
              <Text style={styles.hint}>
                Opcional — matéria e turma por dia para a IA respeitar ao gerar planos.
              </Text>
            </View>
            <Ionicons
              name={gradeExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {gradeExpanded && (
            <View style={{ gap: 4, marginTop: 12 }}>
              {DAYS.map(day => (
                <DayEditor
                  key={day.key}
                  day={day}
                  entries={schedule[day.key]}
                  onChange={entries => updateDayEntries(day.key, entries)}
                />
              ))}
              {!scheduleIsEmpty(schedule) && (
                <TouchableOpacity
                  style={st.clearBtn}
                  onPress={() => setSchedule(EMPTY_SCHEDULE)}
                  activeOpacity={0.8}
                >
                  <Text style={st.clearBtnText}>Limpar grade</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || saving) && styles.buttonDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar alterações</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  dayBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  dayLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.text,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipSubject: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  chipTurma: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.primary,
    opacity: 0.7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputSmall: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  turmaToggle: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  turmaToggleActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  turmaToggleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestion: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  suggestionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  clearBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  clearBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    textDecorationLine: 'underline',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: Colors.primary,
  },
  avatarName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  avatarEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gradeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 2,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputReadonly: {
    opacity: 0.75,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  readonlyText: {
    color: Colors.textSecondary,
  },
  lockedBadge: {
    paddingRight: 14,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#fff',
  },
});
