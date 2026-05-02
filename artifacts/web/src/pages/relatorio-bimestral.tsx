import React, { useState, useMemo, useCallback, useRef } from "react";
import { useStudents } from "@/hooks/use-students";
import { useAuth } from "@/hooks/use-auth";
import {
  useRelatoriosBimestrais,
  useRelatoriosBimestraisStudent,
  useDadosAutomaticos,
  useSaveRelatorioBimestral,
  useUpdateRelatorioBimestral,
  useDeleteRelatorioBimestral,
  useGerarRelatorioBimestral,
  type ObservacaoDisciplina,
  type ObservacoesProfessor,
  type DadosAutomaticos,
  type RelatorioBimestral,
} from "@/hooks/use-relatorios-bimestrais";
import { ClassFilter } from "@/components/class-filter";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  FileText, ChevronLeft, ChevronRight, Plus, Trash2, RotateCcw,
  Save, Download, Loader2, Search, BookOpen, BarChart3, CheckCircle2,
  AlertCircle, Clock, Edit3, User
} from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DISCIPLINAS_PADRAO: string[] = [
  "Matemática",
  "Língua Portuguesa — Gramática",
  "Língua Portuguesa — Leitura e Interpretação",
  "Língua Portuguesa — Escrita e Fluência Leitora",
  "História e Geografia",
  "Ciências",
  "Educação Física",
  "Artes",
];

const BIMESTRES = [1, 2, 3, 4];
const ANO_ATUAL = new Date().getFullYear();

type View = "list" | "form" | "preview";

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "nao_iniciado") {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
        <AlertCircle className="w-3 h-3" /> Não iniciado
      </span>
    );
  }
  if (status === "rascunho") {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Clock className="w-3 h-3" /> Rascunho
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
      <CheckCircle2 className="w-3 h-3" /> Finalizado
    </span>
  );
}

export default function RelatorioBimestral() {
  const { user } = useAuth();
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [bimestre, setBimestre] = useState(1);
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL);
  const [view, setView] = useState<View>("list");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [textoEditado, setTextoEditado] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erroGeracao, setErroGeracao] = useState<string | null>(null);
  const [novaDisciplina, setNovaDisciplina] = useState("");
  const [activeRelatorioId, setActiveRelatorioId] = useState<string | null>(null);

  const [observacoes, setObservacoes] = useState<ObservacoesProfessor>({
    disciplinas: DISCIPLINAS_PADRAO.map(nome => ({ nome, avancos: "", dificuldades: "" })),
    comportamental: "",
    estrategias: "",
    sintese: "",
  });

  const { data: students, isLoading: loadingStudents } = useStudents(classFilter);
  const { data: todosRelatorios } = useRelatoriosBimestrais(bimestre, anoLetivo);
  const { data: dadosAuto } = useDadosAutomaticos(selectedStudentId, bimestre, anoLetivo);
  const { data: relatoriosAluno } = useRelatoriosBimestraisStudent(selectedStudentId, bimestre, anoLetivo);

  const saveRelatorio = useSaveRelatorioBimestral();
  const updateRelatorio = useUpdateRelatorioBimestral();
  const deleteRelatorio = useDeleteRelatorioBimestral();
  const gerarRelatorio = useGerarRelatorioBimestral();

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [students, search]);

  const selectedStudent = useMemo(() => students?.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

  const relatorioAtual = useMemo(() => {
    return relatoriosAluno?.[0] ?? null;
  }, [relatoriosAluno]);

  const getStudentStatus = (studentId: string) => {
    const rel = todosRelatorios?.find(r => r.studentId === studentId);
    return rel?.status ?? "nao_iniciado";
  };

  const handleOpenForm = useCallback((studentId: string) => {
    setSelectedStudentId(studentId);
    setView("form");
    setErroGeracao(null);
    setTextoEditado("");
    const rel = todosRelatorios?.find(r => r.studentId === studentId);
    if (rel) {
      setActiveRelatorioId(rel.id);
      const obs = rel.observacoesProfessor as ObservacoesProfessor;
      if (obs?.disciplinas) {
        setObservacoes(obs);
      } else {
        setObservacoes({
          disciplinas: DISCIPLINAS_PADRAO.map(nome => ({ nome, avancos: "", dificuldades: "" })),
          comportamental: "",
          estrategias: "",
          sintese: "",
        });
      }
    } else {
      setActiveRelatorioId(null);
      setObservacoes({
        disciplinas: DISCIPLINAS_PADRAO.map(nome => ({ nome, avancos: "", dificuldades: "" })),
        comportamental: "",
        estrategias: "",
        sintese: "",
      });
    }
  }, [todosRelatorios]);

  const handleUpdateDisciplina = (idx: number, field: "avancos" | "dificuldades", value: string) => {
    setObservacoes(prev => {
      const disciplinas = [...prev.disciplinas];
      disciplinas[idx] = { ...disciplinas[idx], [field]: value };
      return { ...prev, disciplinas };
    });
  };

  const handleAddDisciplina = () => {
    if (!novaDisciplina.trim()) return;
    setObservacoes(prev => ({
      ...prev,
      disciplinas: [...prev.disciplinas, { nome: novaDisciplina.trim(), avancos: "", dificuldades: "" }],
    }));
    setNovaDisciplina("");
  };

  const handleRemoveDisciplina = (idx: number) => {
    setObservacoes(prev => ({
      ...prev,
      disciplinas: prev.disciplinas.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveRascunho = async () => {
    if (!selectedStudent || !dadosAuto) return;
    await saveRelatorio.mutateAsync({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      bimestre,
      anoLetivo,
      serieTurma: (selectedStudent as any).classId ?? "",
      dadosAutomaticos: dadosAuto as DadosAutomaticos,
      observacoesProfessor: observacoes,
      status: "rascunho",
    });
  };

  const handleGerar = async () => {
    if (!selectedStudent || !dadosAuto) return;
    setGerando(true);
    setErroGeracao(null);
    try {
      await handleSaveRascunho();
      const result = await gerarRelatorio.mutateAsync({
        studentName: selectedStudent.name,
        bimestre,
        anoLetivo,
        serieTurma: (selectedStudent as any).classId ?? "",
        teacherName: user?.name ?? "",
        dadosAutomaticos: dadosAuto as DadosAutomaticos,
        observacoesProfessor: observacoes,
      });
      setTextoEditado(result.texto);
      setView("preview");
    } catch (err: any) {
      setErroGeracao(err?.message ?? "Erro ao gerar relatório");
    } finally {
      setGerando(false);
    }
  };

  const handleSalvarFinal = async () => {
    if (!selectedStudent || !dadosAuto) return;
    await saveRelatorio.mutateAsync({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      bimestre,
      anoLetivo,
      serieTurma: (selectedStudent as any).classId ?? "",
      dadosAutomaticos: dadosAuto as DadosAutomaticos,
      observacoesProfessor: observacoes,
      textoGerado: textoEditado,
      status: "finalizado",
    });
    setView("list");
  };

  const handleExportarPDF = () => {
    if (!textoEditado || !selectedStudent) return;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    const hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    w.document.open();
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Relatório Bimestral — ${selectedStudent.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #111; background: #fff; padding: 2.5cm 2.5cm 2.5cm 3cm; line-height: 1.6; }
    h1 { text-align: center; font-size: 13pt; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; letter-spacing: 1px; }
    .subtitle { text-align: center; font-size: 11pt; margin-bottom: 4px; font-weight: bold; }
    .info { text-align: center; font-size: 10pt; color: #444; margin-bottom: 4px; }
    .divider { border: none; border-top: 1px solid #333; margin: 16px 0; }
    .content { text-align: justify; font-size: 12pt; white-space: pre-wrap; line-height: 1.8; }
    .footer { margin-top: 32px; font-size: 10pt; }
    @media print { body { padding: 1.5cm; } }
  </style>
</head>
<body>
  <h1>${"Escola Pública"}</h1>
  <div class="subtitle">RELATÓRIO BIMESTRAL</div>
  <div class="info">${selectedStudent.name}</div>
  <div class="info">${bimestre}º Bimestre — ${anoLetivo} &nbsp;|&nbsp; Professora(o): ${user?.name ?? ""}</div>
  <hr class="divider"/>
  <div class="content">${textoEditado.replace(/\n/g, "<br/>")}</div>
  <hr class="divider"/>
  <div class="footer">Brasília, ${hoje}<br/>Professora(o): ${user?.name ?? ""}</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
    w.document.close();
  };

  if (view === "preview" && selectedStudent) {
    return (
      <div className="flex flex-col h-screen pt-16 md:pt-0 bg-background">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
          <button onClick={() => setView("form")} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Prévia do Relatório</h1>
            <p className="text-sm text-muted-foreground">{selectedStudent.name} · {bimestre}º Bimestre {anoLetivo}</p>
          </div>
          <button onClick={handleExportarPDF} className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-medium text-sm transition-colors">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
          <button onClick={() => setView("form")} className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-medium text-sm transition-colors">
            <RotateCcw className="w-4 h-4" /> Gerar Novamente
          </button>
          <button
            onClick={handleSalvarFinal}
            disabled={saveRelatorio.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saveRelatorio.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Relatório
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-4xl mx-auto bg-card rounded-3xl border border-border p-8 shadow-sm">
            <textarea
              value={textoEditado}
              onChange={e => setTextoEditado(e.target.value)}
              className="w-full min-h-[600px] bg-transparent text-foreground font-serif text-base leading-relaxed outline-none resize-none"
              placeholder="O texto do relatório aparecerá aqui..."
            />
          </div>
        </div>
      </div>
    );
  }

  if (view === "form" && selectedStudent) {
    return (
      <div className="flex flex-col h-screen pt-16 md:pt-0 bg-background">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
          <button onClick={() => setView("list")} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Relatório Bimestral</h1>
            <p className="text-sm text-muted-foreground">{selectedStudent.name} · {bimestre}º Bimestre {anoLetivo}</p>
          </div>
          <button
            onClick={handleSaveRascunho}
            disabled={saveRelatorio.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-medium text-sm transition-colors"
          >
            {saveRelatorio.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Rascunho
          </button>
          <button
            onClick={handleGerar}
            disabled={gerando}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {gerando ? "Gerando..." : "Gerar com IA"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto p-6 space-y-8">
            {erroGeracao && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm">
                {erroGeracao}
              </div>
            )}

            {/* Bloco A — Dados automáticos */}
            <section className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                <BarChart3 className="w-5 h-5 text-primary" /> Dados do Bimestre (automáticos)
              </h2>
              {!dadosAuto ? (
                <p className="text-muted-foreground text-sm">Carregando dados...</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/40 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{dadosAuto.faltas}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Faltas</p>
                  </div>
                  <div className="bg-muted/40 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{dadosAuto.faltasJustificadas}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Justificadas</p>
                  </div>
                  <div className="bg-muted/40 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{dadosAuto.totalAulas}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Total de Aulas</p>
                  </div>
                  <div className="bg-muted/40 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{dadosAuto.atividades?.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Atividades</p>
                  </div>
                </div>
              )}
            </section>

            {/* Bloco B — Observações por disciplina */}
            <section className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <BookOpen className="w-5 h-5 text-primary" /> Observações por Disciplina
              </h2>

              {observacoes.disciplinas.map((disc, idx) => (
                <div key={idx} className="border border-border/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{disc.nome}</h3>
                    {idx >= DISCIPLINAS_PADRAO.length && (
                      <button onClick={() => handleRemoveDisciplina(idx)} className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1 block">Pontos positivos / Avanços</label>
                    <textarea
                      value={disc.avancos}
                      onChange={e => handleUpdateDisciplina(idx, "avancos", e.target.value)}
                      rows={3}
                      placeholder="Descreva os avanços observados nesta disciplina..."
                      className="w-full px-4 py-3 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none text-sm resize-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-1 block">Dificuldades / Pontos a desenvolver</label>
                    <textarea
                      value={disc.dificuldades}
                      onChange={e => handleUpdateDisciplina(idx, "dificuldades", e.target.value)}
                      rows={3}
                      placeholder="Descreva as dificuldades de forma construtiva..."
                      className="w-full px-4 py-3 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none text-sm resize-none transition-all"
                    />
                  </div>
                </div>
              ))}

              {/* Adicionar disciplina */}
              <div className="flex gap-2">
                <input
                  value={novaDisciplina}
                  onChange={e => setNovaDisciplina(e.target.value)}
                  placeholder="Nome da disciplina..."
                  className="flex-1 px-4 py-2.5 bg-background border-2 border-dashed border-border/60 rounded-xl focus:border-primary outline-none text-sm transition-all"
                  onKeyDown={e => e.key === "Enter" && handleAddDisciplina()}
                />
                <button onClick={handleAddDisciplina} className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-medium text-sm transition-colors">
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </section>

            {/* Bloco C — Aspectos extras */}
            <section className="bg-card rounded-3xl p-6 border border-border/60 shadow-sm space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <User className="w-5 h-5 text-primary" /> Aspectos Gerais
              </h2>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Aspectos Comportamentais e Sociais</label>
                <textarea
                  value={observacoes.comportamental}
                  onChange={e => setObservacoes(prev => ({ ...prev, comportamental: e.target.value }))}
                  rows={4}
                  placeholder="Descreva os aspectos comportamentais e sociais do aluno..."
                  className="w-full px-4 py-3 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none text-sm resize-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Estratégias Pedagógicas Utilizadas</label>
                <textarea
                  value={observacoes.estrategias}
                  onChange={e => setObservacoes(prev => ({ ...prev, estrategias: e.target.value }))}
                  rows={4}
                  placeholder="Descreva as estratégias pedagógicas que você utilizou..."
                  className="w-full px-4 py-3 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none text-sm resize-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Observações Gerais / Síntese</label>
                <textarea
                  value={observacoes.sintese}
                  onChange={e => setObservacoes(prev => ({ ...prev, sintese: e.target.value }))}
                  rows={4}
                  placeholder="Síntese geral do desenvolvimento do aluno..."
                  className="w-full px-4 py-3 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none text-sm resize-none transition-all"
                />
              </div>
            </section>

            <button
              onClick={handleGerar}
              disabled={gerando}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 transition-all"
            >
              {gerando ? <Loader2 className="w-6 h-6 animate-spin" /> : <BookOpen className="w-6 h-6" />}
              {gerando ? "Gerando relatório com IA..." : "Gerar Relatório com IA"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW: LIST
  return (
    <div className="flex flex-col h-screen pt-16 md:pt-0 bg-background">
      <div className="px-6 py-5 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Relatório Bimestral</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gere relatórios completos para a Secretaria de Educação</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-muted/60 rounded-2xl p-1 gap-1">
            {BIMESTRES.map(b => (
              <button
                key={b}
                onClick={() => setBimestre(b)}
                className={cn(
                  "px-4 py-2 rounded-xl font-semibold text-sm transition-all",
                  bimestre === b ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {b}º Bim
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-muted/60 rounded-2xl px-3 py-2">
            <ChevronLeft
              className="w-4 h-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setAnoLetivo(a => a - 1)}
            />
            <span className="font-bold text-sm min-w-[60px] text-center">{anoLetivo}</span>
            <ChevronRight
              className="w-4 h-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setAnoLetivo(a => a + 1)}
            />
          </div>
          <ClassFilter value={classFilter} onChange={setClassFilter} />
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none text-sm transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loadingStudents ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="bg-primary/10 p-6 rounded-full mb-4">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Nenhum aluno encontrado</h2>
            <p className="text-muted-foreground">Cadastre alunos na seção de turmas para começar</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            {filteredStudents.map(student => {
              const status = getStudentStatus(student.id);
              return (
                <div key={student.id} className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl font-display shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{student.name}</p>
                    <div className="mt-1.5">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenForm(student.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all",
                      status === "nao_iniciado"
                        ? "bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20"
                        : status === "rascunho"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                    )}
                  >
                    {status === "nao_iniciado" ? (
                      <><Plus className="w-4 h-4" /> Gerar</>
                    ) : (
                      <><Edit3 className="w-4 h-4" /> Editar</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
