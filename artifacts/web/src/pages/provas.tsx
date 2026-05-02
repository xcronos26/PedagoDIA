import React, { useState, useCallback, useMemo } from "react";
import {
  FileText, Plus, Trash2, Edit2, Download, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, BookOpen, Sparkles, Layers, Check, X,
  Library, Search, Tag, BookMarked, Filter,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/use-activities";
import { useAuth } from "@/hooks/use-auth";
import {
  useExams,
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  useGenerateExam,
  type Exam,
  type Questao,
  type Gabarito,
  type TipoQuestao,
  type OrigemProva,
  type StatusProva,
} from "@/hooks/use-exams";
import {
  useQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useBulkSaveQuestions,
  useDeleteQuestion,
  type Question,
  type CreateQuestionInput,
} from "@/hooks/use-questions";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── PDF Export ────────────────────────────────────────────────────────────────

async function exportPDF(exam: Exam, professoraNome: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 18;

  const addLine = (text: string, size = 11, bold = false, align: "left" | "center" | "right" = "left", color = "#111111") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color);
    if (align === "center") {
      doc.text(text, pageW / 2, y, { align: "center" });
    } else if (align === "right") {
      doc.text(text, pageW - margin, y, { align: "right" });
    } else {
      doc.text(text, margin, y);
    }
    y += size * 0.45;
  };

  const addMultiLine = (text: string, size = 11, bold = false, extraLineH = 0) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor("#111111");
    const lines = doc.splitTextToSize(text, contentW) as string[];
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.45 + extraLineH);
  };

  const addSeparator = () => {
    doc.setDrawColor("#cccccc");
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const checkPage = (needed = 20) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 18;
    }
  };

  const renderProvaPage = (isGabarito: boolean) => {
    if (exam.nomeEscola) {
      addLine(exam.nomeEscola.toUpperCase(), 13, true, "center");
      y += 2;
    }
    addLine(isGabarito ? "GABARITO — USO EXCLUSIVO DA PROFESSORA" : exam.titulo, 12, true, "center");
    y += 3;
    addSeparator();

    if (!isGabarito) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor("#111111");
      doc.text(`Aluno(a): ${"_".repeat(40)}`, margin, y);
      doc.text(`Data: ${"_".repeat(20)}`, pageW - margin - 45, y);
      y += 7;
      doc.text(`Professora: ${"_".repeat(35)}`, margin, y);
      doc.text(`Série/Turma: ${"_".repeat(15)}`, pageW - margin - 45, y);
      y += 7;
      doc.text(`Disciplina: ${"_".repeat(35)}`, margin, y);
      doc.text("Nota: [    ]", pageW - margin - 30, y);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor("#111111");
      doc.text(`Professora: ${professoraNome}`, margin, y);
      doc.text(`Disciplina: ${exam.disciplina}`, pageW / 2, y);
      y += 7;
      doc.text(`Série/Turma: ${exam.serieTurma}`, margin, y);
      doc.text(`Nº de questões: ${exam.numeroQuestoes}`, pageW / 2, y);
    }
    y += 3;
    addSeparator();

    const vpq = parseFloat(exam.valorPorQuestao).toFixed(2).replace(".", ",");

    if (isGabarito) {
      addLine("Gabarito:", 11, true);
      y += 2;
      const cols = 5;
      const cellW = contentW / cols;
      exam.questoes.forEach((q, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        if (col === 0 && i > 0) y += 8;
        if (col === 0) checkPage(10);
        const xPos = margin + col * cellW;
        const gabarito = exam.gabarito[q.numero] || "—";
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${q.numero}. ${gabarito}`, xPos, y);
      });
      y += 12;
      addSeparator();

      addLine("Habilidades avaliadas:", 11, true);
      y += 3;
      exam.questoes.forEach((q) => {
        checkPage(12);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`${q.numero}.`, margin, y);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(q.descritivo, contentW - 8) as string[];
        doc.text(lines, margin + 6, y);
        y += lines.length * 5 + 3;
      });
    } else {
      exam.questoes.forEach((q, idx) => {
        checkPage(30);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${q.numero}.`, margin, y);
        doc.setFont("helvetica", "normal");
        const enunciadoLines = doc.splitTextToSize(q.enunciado, contentW - 10) as string[];
        doc.text(enunciadoLines, margin + 7, y);

        doc.setFontSize(9);
        doc.setTextColor("#666666");
        doc.text(`(${vpq} pts)`, pageW - margin, y, { align: "right" });
        doc.setTextColor("#111111");

        y += enunciadoLines.length * 5 + 3;

        if (q.alternativas) {
          const alts = ["A", "B", "C", "D"] as const;
          alts.forEach((letter) => {
            checkPage(7);
            const text = q.alternativas![letter];
            if (!text) return;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const altLines = doc.splitTextToSize(`${letter}) ${text}`, contentW - 12) as string[];
            doc.text(altLines, margin + 8, y);
            y += altLines.length * 5 + 1;
          });
          y += 4;
        } else {
          y += 2;
          for (let i = 0; i < 4; i++) {
            doc.setDrawColor("#cccccc");
            doc.line(margin, y, pageW - margin, y);
            y += 7;
          }
          y += 3;
        }

        if (idx < exam.questoes.length - 1) {
          checkPage(10);
        }
      });
    }
  };

  renderProvaPage(false);
  doc.addPage();
  y = 18;
  renderProvaPage(true);

  doc.save(`${exam.titulo.replace(/\s+/g, "_")}.pdf`);
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusProva }) {
  const map: Record<StatusProva, { label: string; cls: string }> = {
    rascunho: { label: "Rascunho", cls: "bg-yellow-100 text-yellow-800" },
    ativa: { label: "Ativa", cls: "bg-green-100 text-green-800" },
    finalizada: { label: "Finalizada", cls: "bg-gray-100 text-gray-600" },
  };
  const { label, cls } = map[status];
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", cls)}>{label}</span>;
}

// ── Exam Card ─────────────────────────────────────────────────────────────────

function ExamCard({
  exam,
  onEdit,
  onDelete,
  onExport,
}: {
  exam: Exam;
  onEdit: (e: Exam) => void;
  onDelete: (id: string) => void;
  onExport: (e: Exam) => void;
}) {
  const { mutate: deleteExam, isPending } = useDeleteExam();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!confirm(`Excluir a prova "${exam.titulo}"?`)) return;
    deleteExam(exam.id, {
      onSuccess: () => toast({ title: "Prova excluída." }),
      onError: () => toast({ title: "Erro ao excluir.", variant: "destructive" }),
    });
  };

  const tipoLabel: Record<TipoQuestao, string> = {
    multipla_escolha: "Múltipla Escolha",
    dissertativa: "Dissertativa",
    misto: "Misto",
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={exam.status} />
            <span className="text-xs text-muted-foreground">{tipoLabel[exam.tipoQuestao]}</span>
          </div>
          <h3 className="font-display font-bold text-lg text-foreground truncate">{exam.titulo}</h3>
          <p className="text-sm text-muted-foreground">{exam.disciplina} · {exam.serieTurma}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onExport(exam)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            title="Exportar PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(exam)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground border-t border-border/40 pt-3">
        <span><strong className="text-foreground">{exam.numeroQuestoes}</strong> questões</span>
        <span>Valor total: <strong className="text-foreground">R$ {parseFloat(exam.valorTotal).toFixed(2).replace(".", ",")}</strong></span>
        <span>{parseFloat(exam.valorPorQuestao).toFixed(2).replace(".", ",")} pts/questão</span>
      </div>
    </div>
  );
}

// ── Banco Picker (used inside wizard) ────────────────────────────────────────

function BancoPicker({
  onConfirm,
  onCancel,
  disciplinaHint,
}: {
  onConfirm: (questoes: Questao[]) => void;
  onCancel: () => void;
  disciplinaHint?: string;
}) {
  const { data: questions = [], isLoading } = useQuestions();
  const [search, setSearch] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState(disciplinaHint ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const disciplinas = useMemo(() => {
    const set = new Set(questions.map((q) => q.disciplina).filter(Boolean));
    return Array.from(set).sort();
  }, [questions]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return questions.filter((q) => {
      const matchSearch = !s || q.enunciado.toLowerCase().includes(s) || q.disciplina.toLowerCase().includes(s);
      const matchDisc = !filterDisciplina || q.disciplina === filterDisciplina;
      return matchSearch && matchDisc;
    });
  }, [questions, search, filterDisciplina]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const picked = questions.filter((q) => selected.has(q.id));
    const questoes: Questao[] = picked.map((q, i) => ({
      numero: i + 1,
      enunciado: q.enunciado,
      alternativas: q.alternativas ?? undefined,
      resposta_correta: q.resposta_correta ?? undefined,
      descritivo: q.descritivo,
    }));
    onConfirm(questoes);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Buscar questões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {disciplinas.length > 0 && (
          <select
            className="text-sm border border-border/60 rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={filterDisciplina}
            onChange={(e) => setFilterDisciplina(e.target.value)}
          >
            <option value="">Todas disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <Library className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {questions.length === 0
              ? "Seu banco de questões está vazio. Salve questões de provas anteriores para reutilizá-las aqui."
              : "Nenhuma questão encontrada com esses filtros."}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filtered.map((q) => {
            const sel = selected.has(q.id);
            return (
              <button
                key={q.id}
                onClick={() => toggle(q.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                  sel ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/30"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded flex items-center justify-center border shrink-0 mt-0.5",
                  sel ? "bg-primary border-primary" : "border-border"
                )}>
                  {sel && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{q.enunciado}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {q.disciplina && <span className="text-xs text-muted-foreground">{q.disciplina}</span>}
                    {q.serieTurma && <span className="text-xs text-muted-foreground">· {q.serieTurma}</span>}
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      q.tipoQuestao === "multipla_escolha"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    )}>
                      {q.tipoQuestao === "multipla_escolha" ? "M.E." : "Dissertativa"}
                    </span>
                    {q.tags?.map((t) => (
                      <span key={t} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-semibold transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
            selected.size > 0
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <Check className="w-4 h-4" />
          Usar {selected.size > 0 ? `${selected.size} questão${selected.size !== 1 ? "ões" : ""}` : "questões"}
        </button>
      </div>
    </div>
  );
}

// ── Add/Edit Question Modal ───────────────────────────────────────────────────

function AddQuestionModal({
  onClose,
  initialQuestion,
}: {
  onClose: () => void;
  initialQuestion?: Question;
}) {
  const isEditing = !!initialQuestion;
  const [enunciado, setEnunciado] = useState(initialQuestion?.enunciado ?? "");
  const [disciplina, setDisciplina] = useState(initialQuestion?.disciplina ?? "");
  const [serieTurma, setSerieTurma] = useState(initialQuestion?.serieTurma ?? "");
  const [tipo, setTipo] = useState<"multipla_escolha" | "dissertativa">(
    initialQuestion?.tipoQuestao ?? "multipla_escolha"
  );
  const [alts, setAlts] = useState(
    initialQuestion?.alternativas ?? { A: "", B: "", C: "", D: "" }
  );
  const [respostaCorreta, setRespostaCorreta] = useState(initialQuestion?.resposta_correta ?? "");
  const [descritivo, setDescritivo] = useState(initialQuestion?.descritivo ?? "");
  const [tagsInput, setTagsInput] = useState((initialQuestion?.tags ?? []).join(", "));
  const { mutate: createQuestion, isPending: isCreating } = useCreateQuestion();
  const { mutate: updateQuestion, isPending: isUpdating } = useUpdateQuestion();
  const isPending = isCreating || isUpdating;
  const { toast } = useToast();

  const handleSave = () => {
    if (!enunciado.trim()) {
      toast({ title: "Enunciado é obrigatório", variant: "destructive" });
      return;
    }
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload: CreateQuestionInput = {
      enunciado: enunciado.trim(),
      disciplina,
      serieTurma,
      tipoQuestao: tipo,
      descritivo,
      tags,
      ...(tipo === "multipla_escolha"
        ? { alternativas: alts, resposta_correta: respostaCorreta || null }
        : { alternativas: null, resposta_correta: null }),
    };
    if (isEditing) {
      updateQuestion(
        { id: initialQuestion.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Questão atualizada!" });
            onClose();
          },
          onError: () => toast({ title: "Erro ao atualizar questão.", variant: "destructive" }),
        }
      );
    } else {
      createQuestion(payload, {
        onSuccess: () => {
          toast({ title: "Questão salva no banco!" });
          onClose();
        },
        onError: () => toast({ title: "Erro ao salvar questão.", variant: "destructive" }),
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="font-display font-bold text-xl">{isEditing ? "Editar questão" : "Adicionar questão ao banco"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">Enunciado *</label>
            <textarea
              className="w-full text-sm bg-background border border-border/60 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={3}
              placeholder="Digite o enunciado da questão..."
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Disciplina</label>
              <input
                className="w-full text-sm bg-background border border-border/60 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ex: Matemática"
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1 block">Série/Turma</label>
              <input
                className="w-full text-sm bg-background border border-border/60 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ex: 5º Ano A"
                value={serieTurma}
                onChange={(e) => setSerieTurma(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Tipo de questão</label>
            <div className="grid grid-cols-2 gap-2">
              {(["multipla_escolha", "dissertativa"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-sm font-semibold transition-all",
                    tipo === t ? "border-primary bg-primary/5 text-primary" : "border-border/60 hover:border-primary/40"
                  )}
                >
                  {t === "multipla_escolha" ? "Múltipla Escolha" : "Dissertativa"}
                </button>
              ))}
            </div>
          </div>

          {tipo === "multipla_escolha" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground block">Alternativas</label>
              {(["A", "B", "C", "D"] as const).map((letter) => (
                <div key={letter} className="flex items-center gap-2">
                  <button
                    onClick={() => setRespostaCorreta(letter)}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                      respostaCorreta === letter ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-green-100"
                    )}
                    title="Marcar como correta"
                  >
                    {letter}
                  </button>
                  <input
                    className="flex-1 text-sm bg-background border border-border/60 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder={`Alternativa ${letter}`}
                    value={alts[letter]}
                    onChange={(e) => setAlts((prev) => ({ ...prev, [letter]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">Habilidade avaliada</label>
            <input
              className="w-full text-sm bg-background border border-border/60 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Ex: Interpretar dados em tabelas"
              value={descritivo}
              onChange={(e) => setDescritivo(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">Tags (separadas por vírgula)</label>
            <input
              className="w-full text-sm bg-background border border-border/60 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Ex: frações, 3º bimestre"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || !enunciado.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEditing ? "Salvar alterações" : "Salvar no banco"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Question Bank Tab ─────────────────────────────────────────────────────────

function QuestionBankTab() {
  const { data: questions = [], isLoading } = useQuestions();
  const { mutate: deleteQuestion } = useDeleteQuestion();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | undefined>();

  const disciplinas = useMemo(() => {
    const set = new Set(questions.map((q) => q.disciplina).filter(Boolean));
    return Array.from(set).sort();
  }, [questions]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return questions.filter((q) => {
      const matchSearch = !s || q.enunciado.toLowerCase().includes(s) || q.disciplina.toLowerCase().includes(s) || q.tags?.some((t) => t.toLowerCase().includes(s));
      const matchDisc = !filterDisciplina || q.disciplina === filterDisciplina;
      return matchSearch && matchDisc;
    });
  }, [questions, search, filterDisciplina]);

  const handleDelete = (q: Question) => {
    if (!confirm("Remover esta questão do banco?")) return;
    deleteQuestion(q.id, {
      onSuccess: () => toast({ title: "Questão removida." }),
      onError: () => toast({ title: "Erro ao remover.", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Carregando..." : `${questions.length} questão${questions.length !== 1 ? "ões" : ""} salva${questions.length !== 1 ? "s" : ""}`}
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar questão
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Buscar por enunciado, disciplina ou tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {disciplinas.length > 0 && (
          <select
            className="text-sm border border-border/60 rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={filterDisciplina}
            onChange={(e) => setFilterDisciplina(e.target.value)}
          >
            <option value="">Todas disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Library className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display font-bold text-xl">Banco vazio</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Salve questões de provas geradas pela IA ou adicione manualmente para reutilizá-las em novas avaliações.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-semibold text-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Adicionar primeira questão
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <Search className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma questão encontrada com esses filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((q) => (
            <div key={q.id} className="bg-card border border-border/50 rounded-2xl p-4 flex items-start gap-3 hover:shadow-sm transition-all">
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-sm font-medium text-foreground line-clamp-3">{q.enunciado}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-semibold",
                    q.tipoQuestao === "multipla_escolha" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {q.tipoQuestao === "multipla_escolha" ? "Múltipla Escolha" : "Dissertativa"}
                  </span>
                  {q.disciplina && <span className="text-xs text-muted-foreground">{q.disciplina}</span>}
                  {q.serieTurma && <span className="text-xs text-muted-foreground">· {q.serieTurma}</span>}
                  {q.tags?.map((t) => (
                    <span key={t} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" />{t}
                    </span>
                  ))}
                </div>
                {q.resposta_correta && (
                  <p className="text-xs text-green-600 font-semibold">Resposta: {q.resposta_correta}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditingQuestion(q)}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                  title="Editar questão"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(q)}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Remover do banco"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && <AddQuestionModal onClose={() => setShowAddModal(false)} />}
      {editingQuestion && (
        <AddQuestionModal
          initialQuestion={editingQuestion}
          onClose={() => setEditingQuestion(undefined)}
        />
      )}
    </div>
  );
}

// ── Wizard State Types ────────────────────────────────────────────────────────

type Origem = "ia" | "atividades" | "misto" | "banco";
type Nivel = "facil" | "medio" | "dificil";

interface WizardConfig {
  titulo: string;
  disciplina: string;
  serieTurma: string;
  tema: string;
  nomeEscola: string;
  origem: Origem;
  atividadesSelecionadas: string[];
  numeroQuestoes: number;
  valorTotal: number;
  tipoQuestao: TipoQuestao;
  nivelDificuldade: Nivel;
  status: StatusProva;
}

const defaultConfig: WizardConfig = {
  titulo: "",
  disciplina: "",
  serieTurma: "",
  tema: "",
  nomeEscola: "",
  origem: "ia",
  atividadesSelecionadas: [],
  numeroQuestoes: 10,
  valorTotal: 10,
  tipoQuestao: "multipla_escolha",
  nivelDificuldade: "medio",
  status: "rascunho",
};

// ── Question Editor ───────────────────────────────────────────────────────────

function QuestionEditor({
  questao,
  onChange,
  valorPorQuestao,
}: {
  questao: Questao;
  onChange: (q: Questao) => void;
  valorPorQuestao: number;
}) {
  const isMultipla = !!questao.alternativas;

  return (
    <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-primary">Questão {questao.numero}</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {valorPorQuestao.toFixed(2).replace(".", ",")} pts
        </span>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Enunciado</label>
        <textarea
          className="w-full text-sm bg-background border border-border/60 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          rows={3}
          value={questao.enunciado}
          onChange={(e) => onChange({ ...questao, enunciado: e.target.value })}
        />
      </div>

      {isMultipla && questao.alternativas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(["A", "B", "C", "D"] as const).map((letter) => (
            <div key={letter} className="flex items-start gap-2">
              <span className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1",
                questao.resposta_correta === letter
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              )}>
                {letter}
              </span>
              <input
                className="flex-1 text-sm bg-background border border-border/60 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={questao.alternativas![letter]}
                onChange={(e) =>
                  onChange({
                    ...questao,
                    alternativas: { ...questao.alternativas!, [letter]: e.target.value },
                  })
                }
              />
              <button
                onClick={() => onChange({ ...questao, resposta_correta: letter })}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 transition-colors",
                  questao.resposta_correta === letter
                    ? "bg-green-500 text-white"
                    : "border border-border hover:bg-green-100 hover:text-green-700"
                )}
                title="Marcar como correta"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Habilidade avaliada</label>
        <input
          className="w-full text-sm bg-background border border-border/60 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={questao.descritivo}
          onChange={(e) => onChange({ ...questao, descritivo: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Create/Edit Wizard ────────────────────────────────────────────────────────

function ExamWizard({
  initialExam,
  onClose,
  onSaved,
}: {
  initialExam?: Exam;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!initialExam;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(isEditing ? 4 : 1);
  const [showBancoPicker, setShowBancoPicker] = useState(false);
  const [config, setConfig] = useState<WizardConfig>(() => {
    if (initialExam) {
      return {
        titulo: initialExam.titulo,
        disciplina: initialExam.disciplina,
        serieTurma: initialExam.serieTurma,
        tema: initialExam.tema,
        nomeEscola: initialExam.nomeEscola ?? "",
        origem: initialExam.origem,
        atividadesSelecionadas: initialExam.atividadesBaseIds ?? [],
        numeroQuestoes: parseInt(initialExam.numeroQuestoes),
        valorTotal: parseFloat(initialExam.valorTotal),
        tipoQuestao: initialExam.tipoQuestao,
        nivelDificuldade: "medio",
        status: initialExam.status,
      };
    }
    return defaultConfig;
  });

  const [questoes, setQuestoes] = useState<Questao[]>(initialExam?.questoes ?? []);
  const [gabarito, setGabarito] = useState<Gabarito>(initialExam?.gabarito ?? {});

  const { data: activities = [] } = useActivities();
  const { mutate: generateExam, isPending: isGenerating } = useGenerateExam();
  const { mutate: createExam, isPending: isSaving } = useCreateExam();
  const { mutate: updateExam, isPending: isUpdating } = useUpdateExam();
  const { mutate: bulkSave, isPending: isBulkSaving } = useBulkSaveQuestions();
  const { toast } = useToast();

  const valorPorQuestao = config.numeroQuestoes > 0 ? config.valorTotal / config.numeroQuestoes : 0;

  const updateQuestao = useCallback((index: number, q: Questao) => {
    setQuestoes((prev) => {
      const updated = [...prev];
      updated[index] = q;
      return updated;
    });
    if (q.resposta_correta) {
      setGabarito((prev) => ({ ...prev, [q.numero]: q.resposta_correta! }));
    }
  }, []);

  const handleGenerate = () => {
    const atividadesBase =
      config.origem !== "ia"
        ? config.atividadesSelecionadas
            .map((id) => activities.find((a) => a.id === id))
            .filter(Boolean)
            .map((a) => ({ tema: a!.subject, descricao: a!.description }))
        : undefined;

    generateExam(
      {
        disciplina: config.disciplina,
        serieTurma: config.serieTurma,
        tema: config.tema,
        nivelDificuldade: config.nivelDificuldade,
        numeroQuestoes: config.numeroQuestoes,
        tipoQuestao: config.tipoQuestao,
        atividadesBase,
      },
      {
        onSuccess: (data) => {
          const gab: Gabarito = {};
          data.questoes.forEach((q) => {
            if (q.resposta_correta) gab[q.numero] = q.resposta_correta;
          });
          setQuestoes(data.questoes);
          setGabarito(gab);
          setStep(4);
        },
        onError: (err) => {
          toast({
            title: "Erro ao gerar prova",
            description: err.message,
            variant: "destructive",
          });
          setStep(2);
        },
      }
    );
  };

  const handleBancoConfirm = (picked: Questao[]) => {
    const gab: Gabarito = {};
    picked.forEach((q) => {
      if (q.resposta_correta) gab[q.numero] = q.resposta_correta;
    });
    const hasAlt = picked.some((q) => !!q.alternativas);
    const hasDiss = picked.some((q) => !q.alternativas);
    const derivedTipo: TipoQuestao =
      hasAlt && hasDiss ? "misto" : hasAlt ? "multipla_escolha" : "dissertativa";
    setQuestoes(picked);
    setGabarito(gab);
    setConfig((c) => ({ ...c, numeroQuestoes: picked.length, tipoQuestao: derivedTipo }));
    setShowBancoPicker(false);
    setStep(4);
  };

  const handleSave = (status: StatusProva) => {
    const payload = {
      titulo: config.titulo || `${config.disciplina} — ${config.serieTurma}`,
      disciplina: config.disciplina,
      serieTurma: config.serieTurma,
      tema: config.tema,
      numeroQuestoes: String(questoes.length || config.numeroQuestoes),
      valorTotal: String(config.valorTotal),
      tipoQuestao: config.tipoQuestao,
      origem: config.origem as OrigemProva,
      atividadesBaseIds: config.atividadesSelecionadas,
      questoes,
      gabarito,
      status,
      nomeEscola: config.nomeEscola || undefined,
    };

    if (isEditing) {
      updateExam(
        { id: initialExam!.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: "Prova atualizada!" });
            onSaved();
          },
          onError: () => toast({ title: "Erro ao salvar.", variant: "destructive" }),
        }
      );
    } else {
      createExam(payload, {
        onSuccess: () => {
          toast({ title: status === "rascunho" ? "Rascunho salvo!" : "Prova salva!" });
          onSaved();
        },
        onError: () => toast({ title: "Erro ao salvar.", variant: "destructive" }),
      });
    }
  };

  const handleSaveToBank = () => {
    if (questoes.length === 0) return;
    const toSave: CreateQuestionInput[] = questoes.map((q) => ({
      enunciado: q.enunciado,
      alternativas: q.alternativas ?? null,
      resposta_correta: q.resposta_correta ?? null,
      descritivo: q.descritivo,
      disciplina: config.disciplina,
      serieTurma: config.serieTurma,
      tipoQuestao: q.alternativas ? "multipla_escolha" : "dissertativa",
      tags: [],
    }));
    bulkSave(toSave, {
      onSuccess: (saved) => {
        toast({ title: `${saved.length} questão${saved.length !== 1 ? "ões salvas" : " salva"} no banco!` });
      },
      onError: () => toast({ title: "Erro ao salvar no banco.", variant: "destructive" }),
    });
  };

  const canGoToStep2 =
    config.disciplina.trim() &&
    config.serieTurma.trim() &&
    config.tema.trim() &&
    (config.origem === "ia" || config.origem === "banco" || config.atividadesSelecionadas.length > 0);

  const canGenerate =
    canGoToStep2 && config.numeroQuestoes > 0 && config.valorTotal > 0;

  const isBancoOrigin = config.origem === "banco";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div>
            <h2 className="font-display font-bold text-xl text-foreground">
              {isEditing ? "Editar Prova" : "Nova Prova"}
            </h2>
            {!isEditing && (
              <div className="flex items-center gap-2 mt-1">
                {([1, 2, 3, 4] as const).map((s) => (
                  <div key={s} className={cn(
                    "h-1.5 rounded-full transition-all",
                    s === step ? "bg-primary w-8" : s < step ? "bg-primary/60 w-4" : "bg-muted w-4"
                  )} />
                ))}
                <span className="text-xs text-muted-foreground ml-1">Passo {step} de 4</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* STEP 1 — Origin */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">Título da prova (opcional)</label>
                  <input
                    className="w-full border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    placeholder="Ex: Prova Bimestral de Matemática"
                    value={config.titulo}
                    onChange={(e) => setConfig((c) => ({ ...c, titulo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">Nome da escola (opcional)</label>
                  <input
                    className="w-full border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    placeholder="Ex: EMEF João Paulo II"
                    value={config.nomeEscola}
                    onChange={(e) => setConfig((c) => ({ ...c, nomeEscola: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">Disciplina *</label>
                  <input
                    className="w-full border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    placeholder="Ex: Matemática"
                    value={config.disciplina}
                    onChange={(e) => setConfig((c) => ({ ...c, disciplina: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">Série/Turma *</label>
                  <input
                    className="w-full border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    placeholder="Ex: 5º Ano A"
                    value={config.serieTurma}
                    onChange={(e) => setConfig((c) => ({ ...c, serieTurma: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">Tema / Conteúdo *</label>
                <input
                  className="w-full border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                  placeholder="Ex: Frações e números decimais"
                  value={config.tema}
                  onChange={(e) => setConfig((c) => ({ ...c, tema: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Origem das questões *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: "ia" as Origem, icon: Sparkles, label: "Gerar com IA", desc: "A IA cria questões inéditas" },
                    { value: "atividades" as Origem, icon: BookOpen, label: "Das atividades", desc: "Baseado nas suas atividades" },
                    { value: "misto" as Origem, icon: Layers, label: "Misto", desc: "Combina atividades + IA" },
                    { value: "banco" as Origem, icon: Library, label: "Do banco", desc: "Reutiliza questões salvas" },
                  ].map(({ value, icon: Icon, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setConfig((c) => ({ ...c, origem: value }))}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-left transition-all",
                        config.origem === value
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:border-primary/40"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 mb-2", config.origem === value ? "text-primary" : "text-muted-foreground")} />
                      <div className="font-semibold text-sm">{label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {(config.origem === "atividades" || config.origem === "misto") && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Selecionar atividades ({config.atividadesSelecionadas.length} selecionada{config.atividadesSelecionadas.length !== 1 ? "s" : ""})
                  </label>
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhuma atividade cadastrada ainda.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activities.map((a) => {
                        const selected = config.atividadesSelecionadas.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            onClick={() =>
                              setConfig((c) => ({
                                ...c,
                                atividadesSelecionadas: selected
                                  ? c.atividadesSelecionadas.filter((id) => id !== a.id)
                                  : [...c.atividadesSelecionadas, a.id],
                              }))
                            }
                            className={cn(
                              "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                              selected ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/30"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded flex items-center justify-center border shrink-0 mt-0.5",
                              selected ? "bg-primary border-primary" : "border-border"
                            )}>
                              {selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate">{a.subject}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{a.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Config (AI) or Bank Picker */}
          {step === 2 && !isBancoOrigin && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">Nº de questões</label>
                  <select
                    className="w-full border border-border/60 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    value={config.numeroQuestoes}
                    onChange={(e) => setConfig((c) => ({ ...c, numeroQuestoes: Number(e.target.value) }))}
                  >
                    {[5, 8, 10, 15, 20].map((n) => (
                      <option key={n} value={n}>{n} questões</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1 block">Valor total</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      className="w-full border border-border/60 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                      value={config.valorTotal}
                      onChange={(e) => setConfig((c) => ({ ...c, valorTotal: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-semibold text-foreground mb-1 block">Valor por questão</label>
                  <div className="border border-border/30 rounded-xl px-3 py-2 text-sm bg-muted/30 text-muted-foreground">
                    {valorPorQuestao.toFixed(4)} pts
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Tipo de questão</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "multipla_escolha" as TipoQuestao, label: "Múltipla Escolha", sub: "A / B / C / D" },
                    { value: "dissertativa" as TipoQuestao, label: "Dissertativa", sub: "Resposta aberta" },
                    { value: "misto" as TipoQuestao, label: "Misto", sub: "MC + Dissertativa" },
                  ].map(({ value, label, sub }) => (
                    <button
                      key={value}
                      onClick={() => setConfig((c) => ({ ...c, tipoQuestao: value }))}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-center transition-all",
                        config.tipoQuestao === value
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:border-primary/40"
                      )}
                    >
                      <div className="font-semibold text-sm">{label}</div>
                      <div className="text-xs text-muted-foreground">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Nível de dificuldade</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "facil" as Nivel, label: "Fácil", color: "text-green-600" },
                    { value: "medio" as Nivel, label: "Médio", color: "text-yellow-600" },
                    { value: "dificil" as Nivel, label: "Difícil", color: "text-red-600" },
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => setConfig((c) => ({ ...c, nivelDificuldade: value }))}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-center transition-all",
                        config.nivelDificuldade === value
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:border-primary/40"
                      )}
                    >
                      <span className={cn("font-semibold text-sm", config.nivelDificuldade === value ? color : "")}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Bank Picker */}
          {step === 2 && isBancoOrigin && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display font-bold text-lg mb-1">Selecionar do banco de questões</h3>
                <p className="text-sm text-muted-foreground">Escolha as questões que deseja usar nesta prova.</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1 block">Valor total da prova</label>
                <div className="relative w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    className="w-full border border-border/60 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    value={config.valorTotal}
                    onChange={(e) => setConfig((c) => ({ ...c, valorTotal: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <BancoPicker
                onConfirm={handleBancoConfirm}
                onCancel={() => setStep(1)}
                disciplinaHint={config.disciplina}
              />
            </div>
          )}

          {/* STEP 3 — Generating */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl">Gerando sua prova...</h3>
                <p className="text-muted-foreground mt-1">A IA está criando {config.numeroQuestoes} questões sobre {config.tema}.</p>
                <p className="text-sm text-muted-foreground mt-1">Isso pode levar alguns segundos.</p>
              </div>
            </div>
          )}

          {/* STEP 4 — Preview & Edit */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-display font-bold text-lg">{config.titulo || `${config.disciplina} — ${config.serieTurma}`}</h3>
                  <p className="text-sm text-muted-foreground">{questoes.length} questão{questoes.length !== 1 ? "ões" : ""} · {config.valorTotal} pts total</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && config.origem !== "banco" && (
                    <button
                      onClick={() => { setStep(3); setTimeout(handleGenerate, 100); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-semibold transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Gerar novamente
                    </button>
                  )}
                  {!isEditing && config.origem === "banco" && (
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-semibold transition-colors"
                    >
                      <Library className="w-4 h-4" />
                      Mudar seleção
                    </button>
                  )}
                </div>
              </div>

              {questoes.map((q, i) => (
                <QuestionEditor
                  key={i}
                  questao={q}
                  onChange={(updated) => updateQuestao(i, updated)}
                  valorPorQuestao={valorPorQuestao}
                />
              ))}

              <div className="bg-muted/30 border border-border/40 rounded-2xl p-4">
                <h4 className="font-semibold text-sm mb-3 text-foreground">Gabarito</h4>
                <div className="flex flex-wrap gap-2">
                  {questoes.map((q) => (
                    gabarito[q.numero] ? (
                      <span key={q.numero} className="px-3 py-1 bg-background border border-border/60 rounded-full text-xs font-semibold">
                        {q.numero}. {gabarito[q.numero]}
                      </span>
                    ) : q.alternativas ? null : (
                      <span key={q.numero} className="px-3 py-1 bg-background border border-border/60 rounded-full text-xs text-muted-foreground">
                        {q.numero}. Dissertativa
                      </span>
                    )
                  ))}
                </div>
              </div>

              {/* Save to bank section */}
              {!isEditing && config.origem !== "banco" && questoes.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Library className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Salvar no banco de questões</p>
                      <p className="text-xs text-muted-foreground">Reutilize essas questões em provas futuras.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveToBank}
                    disabled={isBulkSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary/10 text-sm font-semibold transition-colors shrink-0"
                  >
                    {isBulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
                    Salvar {questoes.length} questão{questoes.length !== 1 ? "ões" : ""}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border/50 gap-3">
          <div className="flex items-center gap-2">
            {step > 1 && step !== 3 && !(step === 2 && isBancoOrigin) && (
              <button
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                className="flex items-center gap-1 px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-semibold transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!canGoToStep2}
                className={cn(
                  "flex items-center gap-1 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                  canGoToStep2
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isBancoOrigin ? (
                  <><Library className="w-4 h-4 mr-1" />Escolher do banco</>
                ) : (
                  <>Próximo<ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            )}

            {step === 2 && !isBancoOrigin && (
              <button
                onClick={() => { setStep(3); setTimeout(handleGenerate, 100); }}
                disabled={!canGenerate || isGenerating}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                  canGenerate
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Gerar com IA
              </button>
            )}

            {step === 4 && (
              <>
                <button
                  onClick={() => handleSave("rascunho")}
                  disabled={isSaving || isUpdating}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-semibold transition-colors"
                >
                  {isSaving || isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar rascunho"}
                </button>
                <button
                  onClick={() => handleSave("ativa")}
                  disabled={isSaving || isUpdating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 text-sm font-semibold transition-all"
                >
                  {isSaving || isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <><Check className="w-4 h-4" />Salvar prova</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type MainTab = "provas" | "banco";

export default function Provas() {
  const { data: exams = [], isLoading } = useExams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>("provas");
  const [showWizard, setShowWizard] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | undefined>();
  const { toast } = useToast();

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setShowWizard(true);
  };

  const handleClose = () => {
    setShowWizard(false);
    setEditingExam(undefined);
  };

  const handleExport = async (exam: Exam) => {
    try {
      await exportPDF(exam, user?.name ?? "Professora");
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const byStatus = (status: StatusProva) => exams.filter((e) => e.status === status);
  const ativas = byStatus("ativa");
  const rascunhos = byStatus("rascunho");
  const finalizadas = byStatus("finalizada");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="font-display font-bold text-3xl text-foreground">Central de Provas</h1>
          </div>
          <p className="text-muted-foreground ml-14">Crie, gerencie e exporte provas com IA</p>
        </div>
        {activeTab === "provas" && (
          <button
            onClick={() => { setEditingExam(undefined); setShowWizard(true); }}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-semibold hover:bg-primary/90 shadow-md shadow-primary/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nova prova
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-muted/50 rounded-2xl p-1 w-fit">
        {([
          { key: "provas" as MainTab, icon: FileText, label: "Provas" },
          { key: "banco" as MainTab, icon: Library, label: "Banco de Questões" },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Provas Tab */}
      {activeTab === "provas" && (
        <>
          {isLoading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && exams.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl">Nenhuma prova ainda</h3>
              <p className="text-muted-foreground max-w-xs">Clique em "Nova prova" para criar sua primeira avaliação com IA.</p>
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary/90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Criar prova
              </button>
            </div>
          )}

          {!isLoading && exams.length > 0 && (
            <div className="space-y-8">
              {ativas.length > 0 && (
                <section>
                  <h2 className="font-display font-bold text-lg mb-3 text-foreground">Ativas</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {ativas.map((e) => (
                      <ExamCard key={e.id} exam={e} onEdit={handleEdit} onDelete={() => {}} onExport={handleExport} />
                    ))}
                  </div>
                </section>
              )}
              {rascunhos.length > 0 && (
                <section>
                  <h2 className="font-display font-bold text-lg mb-3 text-foreground">Rascunhos</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {rascunhos.map((e) => (
                      <ExamCard key={e.id} exam={e} onEdit={handleEdit} onDelete={() => {}} onExport={handleExport} />
                    ))}
                  </div>
                </section>
              )}
              {finalizadas.length > 0 && (
                <section>
                  <h2 className="font-display font-bold text-lg mb-3 text-foreground">Finalizadas</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {finalizadas.map((e) => (
                      <ExamCard key={e.id} exam={e} onEdit={handleEdit} onDelete={() => {}} onExport={handleExport} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* Banco Tab */}
      {activeTab === "banco" && <QuestionBankTab />}

      {/* Wizard */}
      {showWizard && (
        <ExamWizard
          initialExam={editingExam}
          onClose={handleClose}
          onSaved={handleClose}
        />
      )}
    </div>
  );
}
