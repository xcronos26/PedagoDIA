import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/utils/api';

const AI_PURPLE = '#7C3AED';
const AI_PURPLE_LIGHT = '#EDE9FE';

// ── Types ─────────────────────────────────────────────────────────────────────

type TipoQuestao = 'multipla_escolha' | 'dissertativa' | 'misto';
type OrigemProva = 'ia' | 'atividades' | 'misto';
type StatusProva = 'rascunho' | 'ativa' | 'finalizada';
type NivelDificuldade = 'facil' | 'medio' | 'dificil';

interface Questao {
  numero: number;
  enunciado: string;
  alternativas?: { A: string; B: string; C: string; D: string };
  resposta_correta?: string;
  descritivo: string;
}

interface Gabarito {
  [numero: number]: string;
}

interface Exam {
  id: string;
  titulo: string;
  disciplina: string;
  serieTurma: string;
  tema: string;
  numeroQuestoes: string;
  valorTotal: string;
  valorPorQuestao: string;
  tipoQuestao: TipoQuestao;
  origem: OrigemProva;
  questoes: Questao[];
  gabarito: Gabarito;
  status: StatusProva;
  nomeEscola: string | null;
  criadaEm: string;
}

// ── Status utils ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<StatusProva, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  finalizada: 'Finalizada',
};

const STATUS_COLOR: Record<StatusProva, string> = {
  rascunho: '#FF9500',
  ativa: '#34C759',
  finalizada: '#9CA3AF',
};

const TIPO_LABEL: Record<TipoQuestao, string> = {
  multipla_escolha: 'Múltipla Escolha',
  dissertativa: 'Dissertativa',
  misto: 'Misto',
};

// ── Exam Card ─────────────────────────────────────────────────────────────────

function ExamCard({
  exam,
  onPress,
  onLongPress,
}: {
  exam: Exam;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress();
      }}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[exam.status] + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[exam.status] }]} />
              <Text style={[styles.statusText, { color: STATUS_COLOR[exam.status] }]}>
                {STATUS_LABEL[exam.status]}
              </Text>
            </View>
            <View style={styles.tipoBadge}>
              <Text style={styles.tipoText}>{TIPO_LABEL[exam.tipoQuestao]}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{exam.titulo || `${exam.disciplina} — ${exam.serieTurma}`}</Text>
          <Text style={styles.cardSub}>{exam.disciplina} · {exam.serieTurma}</Text>
        </View>
        <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}><Text style={styles.cardMetaBold}>{exam.numeroQuestoes}</Text> questões</Text>
        <Text style={styles.cardMeta}>Valor: <Text style={styles.cardMetaBold}>R$ {parseFloat(exam.valorTotal).toFixed(2).replace('.', ',')}</Text></Text>
        <Text style={styles.cardMeta}>{parseFloat(exam.valorPorQuestao).toFixed(2).replace('.', ',')} pts/q</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Question Viewer ───────────────────────────────────────────────────────────

function QuestionView({ questao, valorPorQuestao }: { questao: Questao; valorPorQuestao: number }) {
  const alts = questao.alternativas;
  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <View style={styles.questaoNum}>
          <Text style={styles.questaoNumText}>{questao.numero}</Text>
        </View>
        <Text style={styles.vpq}>{valorPorQuestao.toFixed(2).replace('.', ',')} pts</Text>
      </View>
      <Text style={styles.enunciado}>{questao.enunciado}</Text>
      {alts && (
        <View style={{ gap: 6, marginTop: 8 }}>
          {(['A', 'B', 'C', 'D'] as const).map((letter) => (
            <View
              key={letter}
              style={[
                styles.altRow,
                questao.resposta_correta === letter && styles.altRowCorrect,
              ]}
            >
              <View style={[
                styles.altCircle,
                questao.resposta_correta === letter && styles.altCircleCorrect,
              ]}>
                <Text style={[
                  styles.altLetter,
                  questao.resposta_correta === letter && styles.altLetterCorrect,
                ]}>{letter}</Text>
              </View>
              <Text style={[
                styles.altText,
                questao.resposta_correta === letter && styles.altTextCorrect,
              ]} numberOfLines={3}>{alts[letter]}</Text>
            </View>
          ))}
        </View>
      )}
      {!alts && (
        <View style={styles.dissertativaBox}>
          <Text style={styles.dissertativaLabel}>Resposta dissertativa</Text>
        </View>
      )}
      {questao.descritivo ? (
        <View style={styles.descritivoRow}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.descritivoText}>{questao.descritivo}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Exam Detail Modal ─────────────────────────────────────────────────────────

function ExamDetailModal({
  exam,
  onClose,
  onDelete,
  onShare,
}: {
  exam: Exam;
  onClose: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const insets = useSafeAreaInsets();
  const vpq = exam.numeroQuestoes !== '0'
    ? parseFloat(exam.valorTotal) / parseInt(exam.numeroQuestoes)
    : 0;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.detailContainer, { paddingTop: Platform.OS === 'ios' ? insets.top : 20 }]}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.detailTitle} numberOfLines={1}>{exam.titulo || `${exam.disciplina} — ${exam.serieTurma}`}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity onPress={onShare} style={styles.iconBtn} activeOpacity={0.7}>
              <Feather name="share-2" size={20} color={AI_PURPLE} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.iconBtn} activeOpacity={0.7}>
              <Feather name="trash-2" size={20} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info strip */}
        <View style={styles.infoStrip}>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipLabel}>Disciplina</Text>
            <Text style={styles.infoChipValue}>{exam.disciplina}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipLabel}>Série/Turma</Text>
            <Text style={styles.infoChipValue}>{exam.serieTurma}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipLabel}>Questões</Text>
            <Text style={styles.infoChipValue}>{exam.numeroQuestoes}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipLabel}>Valor Total</Text>
            <Text style={styles.infoChipValue}>R$ {parseFloat(exam.valorTotal).toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.detailScroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Gabarito */}
          {Object.keys(exam.gabarito).length > 0 && (
            <View style={styles.gabaritoBox}>
              <Text style={styles.gabaritoTitle}>Gabarito</Text>
              <View style={styles.gabaritoGrid}>
                {exam.questoes.map((q) => (
                  exam.gabarito[q.numero] ? (
                    <View key={q.numero} style={styles.gabaritoItem}>
                      <Text style={styles.gabaritoItemText}>
                        {q.numero}. <Text style={{ color: AI_PURPLE, fontFamily: 'Inter_700Bold' }}>{exam.gabarito[q.numero]}</Text>
                      </Text>
                    </View>
                  ) : null
                ))}
              </View>
            </View>
          )}

          {/* Questions */}
          <Text style={styles.questoesTitle}>Questões</Text>
          {exam.questoes.map((q) => (
            <QuestionView key={q.numero} questao={q} valorPorQuestao={vpq} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Create Wizard ─────────────────────────────────────────────────────────────

type WizardStep = 'config' | 'generating' | 'preview';

const DEFAULT_CONFIG = {
  titulo: '',
  disciplina: '',
  serieTurma: '',
  tema: '',
  nomeEscola: '',
  numeroQuestoes: 10,
  valorTotal: 10,
  tipoQuestao: 'multipla_escolha' as TipoQuestao,
  nivelDificuldade: 'medio' as NivelDificuldade,
  status: 'ativa' as StatusProva,
};

function CreateWizard({
  visible,
  onClose,
  onSaved,
  token,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  token: string | null;
}) {
  const insets = useSafeAreaInsets();
  const kavBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
  const [step, setStep] = useState<WizardStep>('config');
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG });
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [gabarito, setGabarito] = useState<Gabarito>({});
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setStep('config');
    setConfig({ ...DEFAULT_CONFIG });
    setQuestoes([]);
    setGabarito({});
    setSaving(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const canGenerate =
    config.disciplina.trim() &&
    config.serieTurma.trim() &&
    config.tema.trim() &&
    config.numeroQuestoes > 0 &&
    config.valorTotal > 0;

  const handleGenerate = useCallback(async () => {
    if (!token || !canGenerate) return;
    setStep('generating');
    try {
      const result = await apiFetch<{ questoes: Questao[] }>('/ai/generate-exam', {
        method: 'POST',
        token,
        body: JSON.stringify({
          disciplina: config.disciplina,
          serieTurma: config.serieTurma,
          tema: config.tema,
          nivelDificuldade: config.nivelDificuldade,
          numeroQuestoes: config.numeroQuestoes,
          tipoQuestao: config.tipoQuestao,
        }),
      });
      const gab: Gabarito = {};
      result.questoes.forEach((q) => {
        if (q.resposta_correta) gab[q.numero] = q.resposta_correta;
      });
      setQuestoes(result.questoes);
      setGabarito(gab);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('preview');
    } catch (err: unknown) {
      const apiErr = err as { status?: number };
      Alert.alert(
        'Erro ao gerar prova',
        apiErr?.status === 429 || apiErr?.status === 503
          ? 'A IA está sobrecarregada. Aguarde e tente novamente.'
          : 'Não foi possível gerar a prova. Verifique os dados e tente novamente.',
        [{ text: 'OK', onPress: () => setStep('config') }]
      );
    }
  }, [token, config, canGenerate]);

  const handleSave = async (status: StatusProva) => {
    if (!token) return;
    setSaving(true);
    try {
      await apiFetch('/exams', {
        method: 'POST',
        token,
        body: JSON.stringify({
          titulo: config.titulo || `${config.disciplina} — ${config.serieTurma}`,
          disciplina: config.disciplina,
          serieTurma: config.serieTurma,
          tema: config.tema,
          numeroQuestoes: String(config.numeroQuestoes),
          valorTotal: String(config.valorTotal),
          tipoQuestao: config.tipoQuestao,
          origem: 'ia',
          atividadesBaseIds: [],
          questoes,
          gabarito,
          status,
          nomeEscola: config.nomeEscola || undefined,
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      onSaved();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a prova. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const vpq = config.numeroQuestoes > 0 ? config.valorTotal / config.numeroQuestoes : 0;

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={kavBehavior} style={{ flex: 1 }}>
        <View style={[styles.detailContainer, { paddingTop: Platform.OS === 'ios' ? insets.top : 20 }]}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.detailTitle}>
              {step === 'config' ? 'Nova Prova' : step === 'generating' ? 'Gerando...' : 'Revisar Prova'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Step indicator */}
          {step !== 'generating' && (
            <View style={styles.stepIndicator}>
              {(['config', 'preview'] as WizardStep[]).map((s, i) => (
                <View
                  key={s}
                  style={[styles.stepDot, step === s && styles.stepDotActive, step === 'preview' && i === 0 && styles.stepDotDone]}
                />
              ))}
              <Text style={styles.stepLabel}>
                {step === 'config' ? 'Passo 1 de 2' : 'Passo 2 de 2'}
              </Text>
            </View>
          )}

          {/* STEP: Config */}
          {step === 'config' && (
            <ScrollView
              contentContainerStyle={[styles.wizardScroll, { paddingBottom: insets.bottom + 120 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>Título (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Prova Bimestral de Matemática"
                placeholderTextColor={Colors.textTertiary}
                value={config.titulo}
                onChangeText={(t) => setConfig((c) => ({ ...c, titulo: t }))}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Disciplina *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Matemática"
                placeholderTextColor={Colors.textTertiary}
                value={config.disciplina}
                onChangeText={(t) => setConfig((c) => ({ ...c, disciplina: t }))}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Série/Turma *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 5º Ano A"
                placeholderTextColor={Colors.textTertiary}
                value={config.serieTurma}
                onChangeText={(t) => setConfig((c) => ({ ...c, serieTurma: t }))}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Tema / Conteúdo *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Frações e números decimais"
                placeholderTextColor={Colors.textTertiary}
                value={config.tema}
                onChangeText={(t) => setConfig((c) => ({ ...c, tema: t }))}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.fieldLabel}>Nome da escola (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: EMEF João Paulo II"
                placeholderTextColor={Colors.textTertiary}
                value={config.nomeEscola}
                onChangeText={(t) => setConfig((c) => ({ ...c, nomeEscola: t }))}
                autoCapitalize="words"
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Nº de questões</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
                      {[5, 8, 10, 15, 20].map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={[styles.chip, config.numeroQuestoes === n && styles.chipActive]}
                          onPress={() => setConfig((c) => ({ ...c, numeroQuestoes: n }))}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, config.numeroQuestoes === n && styles.chipTextActive]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Valor total (pts)</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[5, 8, 10, 12, 15, 20].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, config.valorTotal === v && styles.chipActive]}
                    onPress={() => setConfig((c) => ({ ...c, valorTotal: v }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, config.valorTotal === v && styles.chipTextActive]}>{v} pts</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {config.numeroQuestoes > 0 && (
                <Text style={styles.vpqHint}>= {vpq.toFixed(2).replace('.', ',')} pts por questão</Text>
              )}

              <Text style={styles.fieldLabel}>Tipo de questão</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {([
                  { value: 'multipla_escolha', label: 'Múltipla Escolha' },
                  { value: 'dissertativa', label: 'Dissertativa' },
                  { value: 'misto', label: 'Misto' },
                ] as { value: TipoQuestao; label: string }[]).map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, config.tipoQuestao === value && styles.chipActive]}
                    onPress={() => setConfig((c) => ({ ...c, tipoQuestao: value }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, config.tipoQuestao === value && styles.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Nível de dificuldade</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { value: 'facil', label: 'Fácil', color: '#16A34A' },
                  { value: 'medio', label: 'Médio', color: '#D97706' },
                  { value: 'dificil', label: 'Difícil', color: '#DC2626' },
                ] as { value: NivelDificuldade; label: string; color: string }[]).map(({ value, label, color }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, config.nivelDificuldade === value && { ...styles.chipActive, borderColor: color }]}
                    onPress={() => setConfig((c) => ({ ...c, nivelDificuldade: value }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, config.nivelDificuldade === value && { color, fontFamily: 'Inter_600SemiBold' }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* STEP: Generating */}
          {step === 'generating' && (
            <View style={styles.generatingContainer}>
              <View style={styles.generatingIcon}>
                <ActivityIndicator size="large" color={AI_PURPLE} />
              </View>
              <Text style={styles.generatingTitle}>Gerando sua prova...</Text>
              <Text style={styles.generatingSubtitle}>
                A IA está criando {config.numeroQuestoes} questões sobre {config.tema}.{'\n'}Isso pode levar alguns segundos.
              </Text>
            </View>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <ScrollView
              contentContainerStyle={[styles.wizardScroll, { paddingBottom: insets.bottom + 140 }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Info */}
              <View style={styles.previewHeader}>
                <Text style={styles.previewName}>{config.titulo || `${config.disciplina} — ${config.serieTurma}`}</Text>
                <Text style={styles.previewMeta}>{questoes.length} questões · {config.valorTotal} pts total</Text>
              </View>

              {/* Gabarito */}
              {Object.keys(gabarito).length > 0 && (
                <View style={styles.gabaritoBox}>
                  <Text style={styles.gabaritoTitle}>Gabarito</Text>
                  <View style={styles.gabaritoGrid}>
                    {questoes.map((q) => (
                      gabarito[q.numero] ? (
                        <View key={q.numero} style={styles.gabaritoItem}>
                          <Text style={styles.gabaritoItemText}>
                            {q.numero}. <Text style={{ color: AI_PURPLE, fontFamily: 'Inter_700Bold' }}>{gabarito[q.numero]}</Text>
                          </Text>
                        </View>
                      ) : null
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.questoesTitle}>Questões geradas</Text>
              {questoes.map((q) => (
                <QuestionView key={q.numero} questao={q} valorPorQuestao={vpq} />
              ))}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={[styles.wizardFooter, { paddingBottom: insets.bottom + 12 }]}>
            {step === 'config' && (
              <>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, !canGenerate && styles.btnDisabled]}
                  onPress={handleGenerate}
                  disabled={!canGenerate}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Gerar com IA</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'preview' && (
              <>
                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => { setStep('config'); }}
                  activeOpacity={0.8}
                >
                  <Feather name="edit-2" size={16} color={AI_PURPLE} />
                  <Text style={[styles.outlineBtnText, { color: AI_PURPLE }]}>Refazer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.draftBtn}
                  onPress={() => handleSave('rascunho')}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving
                    ? <ActivityIndicator size="small" color={Colors.textSecondary} />
                    : <Text style={styles.draftBtnText}>Rascunho</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, saving && styles.btnDisabled]}
                  onPress={() => handleSave('ativa')}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={styles.primaryBtnText}>Salvar</Text>
                      </>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProvasScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [optionsExam, setOptionsExam] = useState<Exam | null>(null);

  const fetchExams = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<Exam[]>('/exams', { token });
      setExams(data);
    } catch {
      if (!silent) Alert.alert('Erro', 'Não foi possível carregar as provas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleDelete = (exam: Exam) => {
    setOptionsExam(null);
    Alert.alert(
      'Excluir prova',
      `Deseja excluir "${exam.titulo || exam.disciplina}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/exams/${exam.id}`, { method: 'DELETE', token: token ?? undefined });
              setSelectedExam(null);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fetchExams(true);
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir a prova.');
            }
          },
        },
      ]
    );
  };

  const handleShare = async (exam: Exam) => {
    const lines: string[] = [];
    const titulo = exam.titulo || `${exam.disciplina} — ${exam.serieTurma}`;
    lines.push(`📋 ${titulo}`);
    lines.push(`📚 ${exam.disciplina} | ${exam.serieTurma}`);
    lines.push(`📝 ${exam.numeroQuestoes} questões | Valor: ${parseFloat(exam.valorTotal).toFixed(2).replace('.', ',')} pts\n`);

    exam.questoes.forEach((q) => {
      lines.push(`${q.numero}. ${q.enunciado}`);
      if (q.alternativas) {
        ['A', 'B', 'C', 'D'].forEach((l) => {
          lines.push(`   ${l}) ${q.alternativas![l as 'A']}`);
        });
      }
      lines.push('');
    });

    if (Object.keys(exam.gabarito).length > 0) {
      lines.push('--- GABARITO ---');
      exam.questoes.forEach((q) => {
        if (exam.gabarito[q.numero]) {
          lines.push(`${q.numero}. ${exam.gabarito[q.numero]}`);
        }
      });
    }

    try {
      await Share.share({ message: lines.join('\n'), title: titulo });
    } catch {
      // user cancelled
    }
  };

  const sorted = [...exams].sort((a, b) => {
    const order: StatusProva[] = ['ativa', 'rascunho', 'finalizada'];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  const renderExam = ({ item }: { item: Exam }) => (
    <ExamCard
      exam={item}
      onPress={() => setSelectedExam(item)}
      onLongPress={() => setOptionsExam(item)}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Central de Provas</Text>
          <Text style={styles.headerSub}>Crie provas com IA</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={AI_PURPLE} />
        </View>
      ) : exams.length === 0 ? (
        <View style={styles.centeredContainer}>
          <View style={styles.emptyIcon}>
            <Feather name="file-text" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma prova ainda</Text>
          <Text style={styles.emptySub}>Toque no + para criar sua primeira prova com IA</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 20, alignSelf: 'center' }]}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Nova prova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderExam}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPadding + 110 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={() => { setRefreshing(true); fetchExams(true); }}
          refreshing={refreshing}
        />
      )}

      {/* Options bottom sheet (long press) */}
      <Modal
        visible={!!optionsExam}
        transparent
        animationType="slide"
        onRequestClose={() => setOptionsExam(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsExam(null)}
        >
          <View style={[styles.optionsSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.optionsTitle} numberOfLines={1}>
              {optionsExam?.titulo || optionsExam?.disciplina}
            </Text>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => { setSelectedExam(optionsExam); setOptionsExam(null); }}
              activeOpacity={0.8}
            >
              <Feather name="eye" size={20} color={Colors.primary} />
              <Text style={[styles.optionText, { color: Colors.primary }]}>Ver prova</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => optionsExam && handleShare(optionsExam)}
              activeOpacity={0.8}
            >
              <Feather name="share-2" size={20} color={AI_PURPLE} />
              <Text style={[styles.optionText, { color: AI_PURPLE }]}>Compartilhar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionRow, styles.optionDelete]}
              onPress={() => optionsExam && handleDelete(optionsExam)}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={20} color={Colors.danger} />
              <Text style={[styles.optionText, { color: Colors.danger }]}>Excluir prova</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Detail Modal */}
      {selectedExam && (
        <ExamDetailModal
          exam={selectedExam}
          onClose={() => setSelectedExam(null)}
          onDelete={() => handleDelete(selectedExam)}
          onShare={() => handleShare(selectedExam)}
        />
      )}

      {/* Create Wizard */}
      <CreateWizard
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => { setShowCreate(false); fetchExams(true); }}
        token={token}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.text },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addButton: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: AI_PURPLE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: AI_PURPLE, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 32,
    backgroundColor: AI_PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text, textAlign: 'center' },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Card
  card: {
    backgroundColor: Colors.surface, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text, lineHeight: 22 },
  cardSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  cardFooter: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10, flexWrap: 'wrap' },
  cardMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary },
  cardMetaBold: { fontFamily: 'Inter_600SemiBold', color: Colors.text },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  tipoBadge: { backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tipoText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textSecondary },

  // Detail
  detailContainer: { flex: 1, backgroundColor: Colors.background },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: Colors.text, flex: 1, textAlign: 'center' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  infoStrip: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoChip: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 6 },
  infoChipLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.textTertiary },
  infoChipValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text, marginTop: 1 },
  detailScroll: { padding: 16, gap: 12 },

  // Question
  questionCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 14,
  },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  questaoNum: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: AI_PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  questaoNumText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: AI_PURPLE },
  vpq: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary },
  enunciado: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, lineHeight: 20 },
  altRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.surfaceSecondary, borderRadius: 10, padding: 8,
  },
  altRowCorrect: { backgroundColor: '#D1FAE5' },
  altCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  altCircleCorrect: { backgroundColor: '#10B981' },
  altLetter: { fontFamily: 'Inter_700Bold', fontSize: 12, color: Colors.textSecondary },
  altLetterCorrect: { color: '#fff' },
  altText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text, flex: 1, lineHeight: 18 },
  altTextCorrect: { fontFamily: 'Inter_600SemiBold', color: '#065F46' },
  dissertativaBox: {
    marginTop: 8, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed', padding: 12, alignItems: 'center',
  },
  dissertativaLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary },
  descritivoRow: { flexDirection: 'row', gap: 5, marginTop: 8, alignItems: 'flex-start' },
  descritivoText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textTertiary, flex: 1, lineHeight: 15 },

  // Gabarito
  gabaritoBox: {
    backgroundColor: AI_PURPLE_LIGHT, borderRadius: 14, padding: 14,
  },
  gabaritoTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: AI_PURPLE, marginBottom: 10 },
  gabaritoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gabaritoItem: {
    backgroundColor: Colors.surface, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  gabaritoItemText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.text },
  questoesTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text, marginBottom: 4 },

  // Wizard
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: AI_PURPLE, width: 20 },
  stepDotDone: { backgroundColor: AI_PURPLE },
  stepLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary, marginLeft: 4 },
  wizardScroll: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.text, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text,
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: AI_PURPLE, backgroundColor: AI_PURPLE_LIGHT },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: AI_PURPLE, fontFamily: 'Inter_600SemiBold' },
  vpqHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  generatingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  generatingIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: AI_PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  generatingTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.text },
  generatingSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  previewHeader: { marginBottom: 4 },
  previewName: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  previewMeta: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  // Footer / Buttons
  wizardFooter: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: AI_PURPLE, borderRadius: 14, paddingVertical: 14,
    shadowColor: AI_PURPLE, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  cancelBtn: {
    paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingVertical: 14,
  },
  cancelBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: AI_PURPLE,
  },
  outlineBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  draftBtn: {
    paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  draftBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.textSecondary },
  btnDisabled: { opacity: 0.45 },

  // Options sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  optionsSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, gap: 4,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
    alignSelf: 'center', marginBottom: 12,
  },
  optionsTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text, marginBottom: 8 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderRadius: 12, paddingHorizontal: 4,
  },
  optionDelete: { borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 4 },
  optionText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
