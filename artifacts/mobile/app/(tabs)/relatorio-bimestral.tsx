import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/utils/api';
import { ClassPicker, NO_CLASS_FILTER } from '@/components/ClassPicker';

const DISCIPLINAS_PADRAO = [
  'Matemática',
  'Língua Portuguesa — Gramática',
  'Língua Portuguesa — Leitura e Interpretação',
  'Língua Portuguesa — Escrita e Fluência Leitora',
  'História e Geografia',
  'Ciências',
  'Educação Física',
  'Artes',
];

const BIMESTRES = [1, 2, 3, 4];
const ANO_ATUAL = new Date().getFullYear();

type View = 'list' | 'form' | 'preview';
type Status = 'nao_iniciado' | 'rascunho' | 'finalizado';

interface DisciplinaObs {
  nome: string;
  avancos: string;
  dificuldades: string;
}
interface Observacoes {
  disciplinas: DisciplinaObs[];
  comportamental: string;
  estrategias: string;
  sintese: string;
}
interface RelatorioBimestral {
  id: string;
  studentId: string;
  studentName: string;
  bimestre: number;
  anoLetivo: number;
  serieTurma: string;
  dadosAutomaticos: any;
  observacoesProfessor: any;
  textoGerado: string | null;
  status: 'rascunho' | 'finalizado';
}

function StatusBadge({ status }: { status: Status }) {
  const map = {
    nao_iniciado: { label: 'Não iniciado', color: Colors.textTertiary, bg: Colors.surfaceSecondary },
    rascunho: { label: 'Rascunho', color: '#92400E', bg: '#FEF3C7' },
    finalizado: { label: 'Finalizado', color: '#166534', bg: '#DCFCE7' },
  };
  const s = map[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export default function RelatorioBimestralScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { students, classes, selectedClassId, setSelectedClassId } = useApp();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [bimestre, setBimestre] = useState(1);
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL);
  const [view, setView] = useState<View>('list');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [relatorios, setRelatorios] = useState<RelatorioBimestral[]>([]);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [textoGerado, setTextoGerado] = useState('');
  const [erroGeracao, setErroGeracao] = useState<string | null>(null);
  const [dadosAuto, setDadosAuto] = useState<any>(null);
  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [mostrarAddDisc, setMostrarAddDisc] = useState(false);

  const [observacoes, setObservacoes] = useState<Observacoes>({
    disciplinas: DISCIPLINAS_PADRAO.map(nome => ({ nome, avancos: '', dificuldades: '' })),
    comportamental: '',
    estrategias: '',
    sintese: '',
  });

  const filteredStudents = selectedClassId && selectedClassId !== NO_CLASS_FILTER
    ? students.filter(s => s.classId === selectedClassId)
    : selectedClassId === NO_CLASS_FILTER
    ? students.filter(s => !s.classId)
    : students;

  const fetchRelatorios = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<RelatorioBimestral[]>(
        `/relatorios-bimestrais?bimestre=${bimestre}&anoLetivo=${anoLetivo}`, { token }
      );
      setRelatorios(data);
    } catch { } finally {
      setLoading(false);
    }
  }, [token, bimestre, anoLetivo]);

  useEffect(() => { fetchRelatorios(); }, [fetchRelatorios]);

  const fetchDadosAuto = useCallback(async (studentId: string) => {
    if (!token) return;
    try {
      const data = await apiFetch(`/relatorios-bimestrais/dados/${studentId}?bimestre=${bimestre}&anoLetivo=${anoLetivo}`, { token });
      setDadosAuto(data);
    } catch { setDadosAuto(null); }
  }, [token, bimestre, anoLetivo]);

  const getStatus = (studentId: string): Status => {
    const rel = relatorios.find(r => r.studentId === studentId);
    return (rel?.status as Status) ?? 'nao_iniciado';
  };

  const handleOpenForm = async (student: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStudent(student);
    setErroGeracao(null);
    setTextoGerado('');
    const rel = relatorios.find(r => r.studentId === student.id);
    if (rel?.observacoesProfessor?.disciplinas) {
      setObservacoes(rel.observacoesProfessor as Observacoes);
    } else {
      setObservacoes({
        disciplinas: DISCIPLINAS_PADRAO.map(nome => ({ nome, avancos: '', dificuldades: '' })),
        comportamental: '', estrategias: '', sintese: '',
      });
    }
    await fetchDadosAuto(student.id);
    setView('form');
  };

  const handleSaveRascunho = async (silent = false) => {
    if (!selectedStudent || !token) return;
    setSalvando(true);
    try {
      await apiFetch('/relatorios-bimestrais', {
        method: 'POST', token,
        body: JSON.stringify({
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          bimestre, anoLetivo,
          serieTurma: selectedStudent.classId ?? '',
          dadosAutomaticos: dadosAuto ?? {},
          observacoesProfessor: observacoes,
          status: 'rascunho',
        }),
      });
      await fetchRelatorios();
      if (!silent) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Salvo!', 'Rascunho salvo com sucesso.');
      }
    } catch {
      if (!silent) Alert.alert('Erro', 'Não foi possível salvar o rascunho.');
    } finally { setSalvando(false); }
  };

  const handleGerar = async () => {
    if (!selectedStudent || !token) return;
    setGerando(true);
    setErroGeracao(null);
    try {
      await handleSaveRascunho(true);
      const result = await apiFetch<{ texto: string }>('/relatorios-bimestrais/gerar', {
        method: 'POST', token,
        body: JSON.stringify({
          studentName: selectedStudent.name,
          bimestre, anoLetivo,
          serieTurma: selectedStudent.classId ?? '',
          dadosAutomaticos: dadosAuto ?? {},
          observacoesProfessor: observacoes,
        }),
      });
      setTextoGerado(result.texto);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setView('preview');
    } catch (err: any) {
      setErroGeracao(err?.message ?? 'Erro ao gerar relatório');
    } finally { setGerando(false); }
  };

  const handleSalvarFinal = async () => {
    if (!selectedStudent || !token) return;
    setSalvando(true);
    try {
      await apiFetch('/relatorios-bimestrais', {
        method: 'POST', token,
        body: JSON.stringify({
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          bimestre, anoLetivo,
          serieTurma: selectedStudent.classId ?? '',
          dadosAutomaticos: dadosAuto ?? {},
          observacoesProfessor: observacoes,
          textoGerado,
          status: 'finalizado',
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchRelatorios();
      setView('list');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o relatório.');
    } finally { setSalvando(false); }
  };

  const handleExportarPDF = async () => {
    if (!textoGerado || !selectedStudent) return;
    try {
      const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
        body{font-family:'Times New Roman',serif;font-size:12pt;color:#111;padding:2.5cm 2.5cm 2.5cm 3cm;line-height:1.6;}
        h1{text-align:center;font-size:13pt;text-transform:uppercase;font-weight:bold;margin-bottom:4px;}
        .sub{text-align:center;font-size:11pt;font-weight:bold;margin-bottom:4px;}
        .info{text-align:center;font-size:10pt;color:#444;margin-bottom:4px;}
        hr{border:none;border-top:1px solid #333;margin:16px 0;}
        .content{text-align:justify;font-size:12pt;white-space:pre-wrap;line-height:1.8;}
        .footer{margin-top:32px;font-size:10pt;}
      </style></head><body>
        <h1>Escola</h1>
        <div class="sub">RELATÓRIO BIMESTRAL</div>
        <div class="info">${selectedStudent.name}</div>
        <div class="info">${bimestre}º Bimestre — ${anoLetivo}</div>
        <hr/>
        <div class="content">${textoGerado.replace(/\n/g, '<br/>')}</div>
        <hr/>
        <div class="footer">Brasília, ${hoje}</div>
      </body></html>`;
      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
  };

  const updateDisc = (idx: number, field: 'avancos' | 'dificuldades', val: string) => {
    setObservacoes(prev => {
      const d = [...prev.disciplinas];
      d[idx] = { ...d[idx], [field]: val };
      return { ...prev, disciplinas: d };
    });
  };

  // ── PREVIEW ─────────────────────────────────────────────────────────────────
  if (view === 'preview' && selectedStudent) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('form')} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Prévia do Relatório</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{selectedStudent.name} · {bimestre}º Bim {anoLetivo}</Text>
          </View>
        </View>
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleExportarPDF} activeOpacity={0.8}>
            <Feather name="download" size={16} color={Colors.primary} />
            <Text style={[styles.actionBtnText, { color: Colors.primary }]}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setView('form')} activeOpacity={0.8}>
            <Feather name="rotate-ccw" size={16} color={Colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: Colors.textSecondary }]}>Regen.</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnPrimary, salvando && { opacity: 0.6 }]}
            onPress={handleSalvarFinal} activeOpacity={0.8} disabled={salvando}
          >
            {salvando ? <ActivityIndicator size={16} color="#fff" /> : <Feather name="save" size={16} color="#fff" />}
            <Text style={styles.actionBtnPrimaryText}>Salvar</Text>
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            <View style={styles.previewCard}>
              <TextInput
                value={textoGerado}
                onChangeText={setTextoGerado}
                multiline
                style={styles.previewText}
                textAlignVertical="top"
                placeholder="O texto do relatório aparecerá aqui..."
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── FORM ─────────────────────────────────────────────────────────────────────
  if (view === 'form' && selectedStudent) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('list')} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedStudent.name}</Text>
            <Text style={styles.headerSub}>{bimestre}º Bimestre · {anoLetivo}</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, salvando && { opacity: 0.6 }]}
            onPress={() => handleSaveRascunho(false)}
            activeOpacity={0.8} disabled={salvando}
          >
            {salvando ? <ActivityIndicator size={14} color={Colors.primary} /> : <Feather name="save" size={14} color={Colors.primary} />}
            <Text style={styles.saveBtnText}>Rascunho</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
          {erroGeracao ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{erroGeracao}</Text>
            </View>
          ) : null}

          {/* Dados automáticos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados do Bimestre</Text>
            {dadosAuto ? (
              <View style={styles.statsRow}>
                <View style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.statNum, { color: '#DC2626' }]}>{dadosAuto.faltas ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: '#DC2626' }]}>Faltas</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.statNum, { color: '#D97706' }]}>{dadosAuto.faltasJustificadas ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: '#D97706' }]}>Justif.</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: Colors.primaryLight }]}>
                  <Text style={[styles.statNum, { color: Colors.primary }]}>{dadosAuto.totalAulas ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: Colors.primary }]}>Aulas</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.statNum, { color: '#16A34A' }]}>{dadosAuto.atividades?.length ?? 0}</Text>
                  <Text style={[styles.statLabel, { color: '#16A34A' }]}>Ativid.</Text>
                </View>
              </View>
            ) : (
              <ActivityIndicator color={Colors.primary} style={{ margin: 12 }} />
            )}
          </View>

          {/* Disciplinas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações por Disciplina</Text>
            {observacoes.disciplinas.map((disc, idx) => (
              <View key={idx} style={styles.discCard}>
                <View style={styles.discHeader}>
                  <Text style={styles.discName}>{disc.nome}</Text>
                  {idx >= DISCIPLINAS_PADRAO.length && (
                    <TouchableOpacity onPress={() => {
                      setObservacoes(prev => ({
                        ...prev,
                        disciplinas: prev.disciplinas.filter((_, i) => i !== idx)
                      }));
                    }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="trash-2" size={14} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.discFieldLabel}>Pontos positivos / Avanços</Text>
                <TextInput
                  value={disc.avancos}
                  onChangeText={v => updateDisc(idx, 'avancos', v)}
                  multiline
                  style={styles.textarea}
                  placeholder="Descreva os avanços observados..."
                  placeholderTextColor={Colors.textTertiary}
                  textAlignVertical="top"
                />
                <Text style={[styles.discFieldLabel, { color: '#D97706', marginTop: 8 }]}>Dificuldades / Pontos a desenvolver</Text>
                <TextInput
                  value={disc.dificuldades}
                  onChangeText={v => updateDisc(idx, 'dificuldades', v)}
                  multiline
                  style={styles.textarea}
                  placeholder="Descreva as dificuldades de forma construtiva..."
                  placeholderTextColor={Colors.textTertiary}
                  textAlignVertical="top"
                />
              </View>
            ))}

            {mostrarAddDisc ? (
              <View style={styles.addDiscRow}>
                <TextInput
                  value={novaDisciplina}
                  onChangeText={setNovaDisciplina}
                  placeholder="Nome da disciplina..."
                  style={styles.addDiscInput}
                  placeholderTextColor={Colors.textTertiary}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => {
                    if (!novaDisciplina.trim()) return;
                    setObservacoes(prev => ({
                      ...prev,
                      disciplinas: [...prev.disciplinas, { nome: novaDisciplina.trim(), avancos: '', dificuldades: '' }]
                    }));
                    setNovaDisciplina('');
                    setMostrarAddDisc(false);
                  }}
                  style={styles.addDiscConfirm}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addDiscBtn} onPress={() => setMostrarAddDisc(true)} activeOpacity={0.8}>
                <Feather name="plus-circle" size={16} color={Colors.primary} />
                <Text style={styles.addDiscBtnText}>Adicionar disciplina</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Aspectos gerais */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aspectos Gerais</Text>
            <Text style={styles.fieldLabel}>Aspectos Comportamentais e Sociais</Text>
            <TextInput
              value={observacoes.comportamental}
              onChangeText={v => setObservacoes(prev => ({ ...prev, comportamental: v }))}
              multiline style={[styles.textarea, { minHeight: 80 }]}
              placeholder="Descreva os aspectos comportamentais..."
              placeholderTextColor={Colors.textTertiary}
              textAlignVertical="top"
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Estratégias Pedagógicas</Text>
            <TextInput
              value={observacoes.estrategias}
              onChangeText={v => setObservacoes(prev => ({ ...prev, estrategias: v }))}
              multiline style={[styles.textarea, { minHeight: 80 }]}
              placeholder="Estratégias que você utilizou..."
              placeholderTextColor={Colors.textTertiary}
              textAlignVertical="top"
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Observações Gerais / Síntese</Text>
            <TextInput
              value={observacoes.sintese}
              onChangeText={v => setObservacoes(prev => ({ ...prev, sintese: v }))}
              multiline style={[styles.textarea, { minHeight: 80 }]}
              placeholder="Síntese geral do desenvolvimento..."
              placeholderTextColor={Colors.textTertiary}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.generateBtn, gerando && { opacity: 0.7 }]}
            onPress={handleGerar}
            activeOpacity={0.85}
            disabled={gerando}
          >
            {gerando
              ? <ActivityIndicator color="#fff" size={22} />
              : <Feather name="zap" size={22} color="#fff" />
            }
            <Text style={styles.generateBtnText}>
              {gerando ? 'Gerando relatório com IA...' : 'Gerar Relatório com IA'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── LIST ─────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Rel. Bimestral</Text>
          <Text style={styles.subtitle}>Relatórios para a Secretaria</Text>
        </View>
      </View>

      {/* Bimestre selector */}
      <View style={styles.bimRow}>
        {BIMESTRES.map(b => (
          <TouchableOpacity
            key={b}
            style={[styles.bimBtn, bimestre === b && styles.bimBtnActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBimestre(b); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.bimBtnText, bimestre === b && styles.bimBtnTextActive]}>{b}º Bim</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.anoRow}>
        <TouchableOpacity onPress={() => setAnoLetivo(a => a - 1)} style={styles.anoBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.anoText}>{anoLetivo}</Text>
        <TouchableOpacity onPress={() => setAnoLetivo(a => a + 1)} style={styles.anoBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <ClassPicker
          selectedClassId={selectedClassId}
          onSelectClass={setSelectedClassId}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="file-text" size={40} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhum aluno</Text>
              <Text style={styles.emptySubtitle}>Cadastre alunos em Turmas para começar</Text>
            </View>
          ) : (
            filteredStudents.map(student => {
              const status = getStatus(student.id);
              return (
                <TouchableOpacity
                  key={student.id}
                  style={styles.studentCard}
                  onPress={() => handleOpenForm(student)}
                  activeOpacity={0.85}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{student.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                    <StatusBadge status={status} />
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8, gap: 12 },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: Colors.surfaceSecondary },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: Colors.text },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  bimRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  bimBtn: { flex: 1, paddingVertical: 8, borderRadius: 16, alignItems: 'center', backgroundColor: Colors.surfaceSecondary },
  bimBtnActive: { backgroundColor: Colors.primary },
  bimBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.textSecondary },
  bimBtnTextActive: { color: '#fff' },
  anoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 },
  anoBtn: { padding: 6, borderRadius: 10, backgroundColor: Colors.surfaceSecondary },
  anoText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text, minWidth: 60, textAlign: 'center' },
  studentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 18,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.primary },
  studentName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text, marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: Colors.primaryLight },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.primary },
  previewActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.surfaceSecondary },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  actionBtnPrimary: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.primary },
  actionBtnPrimaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },
  previewCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border },
  previewText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.text, lineHeight: 22, minHeight: 500 },
  section: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, alignItems: 'center', borderRadius: 14, padding: 10 },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 2 },
  discCard: { backgroundColor: Colors.background, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  discHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  discName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text, flex: 1 },
  discFieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  textarea: {
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 14, padding: 12, fontSize: 13, fontFamily: 'Inter_400Regular',
    color: Colors.text, minHeight: 70,
  },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  addDiscBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, justifyContent: 'center' },
  addDiscBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.primary },
  addDiscRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  addDiscInput: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 14, padding: 12, fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.text,
  },
  addDiscConfirm: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: Colors.primary, borderRadius: 20, paddingVertical: 18, marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  generateBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { color: '#DC2626', fontFamily: 'Inter_500Medium', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text, marginBottom: 6 },
  emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
