import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, BookOpen, Plus, X, Save, Loader2, Sparkles, Wand2, Brain } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLessonPlans, useUpsertLessonPlan, useLinkActivity, useUnlinkActivity, type LessonPlan } from "@/hooks/use-lesson-plans";
import { useActivities, useCreateActivity, type Activity } from "@/hooks/use-activities";
import { useSubjects } from "@/hooks/use-subjects";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

function getCalendarWeeks(month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const weekStarts = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
  return weekStarts.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  });
}

function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

interface AiSuggestions {
  bncc: string[];
  objetivos: string[];
}

interface DayPlan {
  tema: string;
  objetivo: string;
  bncc: { codigo: string; descricao: string };
  descricao: string;
  atividade: string;
}

interface WeekDayRegente {
  dia: string;
  aulas: Array<DayPlan & { disciplina: string }>;
}

interface WeekDayDisciplina {
  dia: string;
  tema: string;
  objetivo: string;
  bncc: { codigo: string; descricao: string };
  descricao: string;
  atividade: string;
}

type WeekPlan = { semana: WeekDayRegente[] } | { semana: WeekDayDisciplina[] };

interface GeneratedActivity {
  titulo: string;
  descricao: string;
  tipo: "classwork" | "homework";
  bncc: { codigo: string; descricao: string } | null;
}

export default function Planejamento() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tema, setTema] = useState("");
  const [description, setDescription] = useState("");
  const [linkingActivity, setLinkingActivity] = useState(false);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState<{ subject: string; type: 'homework' | 'classwork'; description: string; link: string }>({ subject: '', type: 'homework', description: '', link: '' });
  const [saving, setSaving] = useState(false);

  const [suggestions, setSuggestions] = useState<AiSuggestions | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [aiPlanModal, setAiPlanModal] = useState(false);
  const [aiPlanSerie, setAiPlanSerie] = useState("");
  const [aiPlanTipo, setAiPlanTipo] = useState<"regente" | "disciplina">("regente");
  const [aiPlanDisciplina, setAiPlanDisciplina] = useState("");
  const [aiPlanTema, setAiPlanTema] = useState("");
  const [aiPlanMode, setAiPlanMode] = useState<"day" | "week">("day");
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState<DayPlan | WeekPlan | null>(null);

  const [aiActivityModal, setAiActivityModal] = useState(false);
  const [aiActivitySerie, setAiActivitySerie] = useState("");
  const [aiActivityDisciplina, setAiActivityDisciplina] = useState("");
  const [aiActivityTema, setAiActivityTema] = useState("");
  const [aiActivityLoading, setAiActivityLoading] = useState(false);
  const [aiActivityResult, setAiActivityResult] = useState<GeneratedActivity | null>(null);

  const monthStr = format(currentMonth, 'yyyy-MM');
  const { data: plans, isLoading: plansLoading } = useLessonPlans(monthStr);
  const { data: activities } = useActivities();
  const { data: subjects } = useSubjects();
  const { mutateAsync: upsertPlan } = useUpsertLessonPlan();
  const { mutateAsync: linkActivity } = useLinkActivity();
  const { mutateAsync: unlinkActivity } = useUnlinkActivity();
  const { mutateAsync: createActivity } = useCreateActivity();

  const plansByDate = useMemo(() => {
    const map: Record<string, LessonPlan> = {};
    plans?.forEach(p => { map[p.date] = p; });
    return map;
  }, [plans]);

  const selectedPlan = selectedDate ? plansByDate[selectedDate] : null;

  useEffect(() => {
    setDescription(selectedPlan?.description ?? "");
    setTema(selectedPlan?.tema ?? "");
    setSuggestions(null);
  }, [selectedDate, selectedPlan?.id]);

  const calendarWeeks = useMemo(() => getCalendarWeeks(currentMonth), [currentMonth]);

  const handleSelectDay = useCallback((date: Date) => {
    const dateStr = toLocalISO(date);
    setSelectedDate(dateStr);
    setLinkingActivity(false);
    setCreatingActivity(false);
  }, []);

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    setSuggestions(null);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (val.trim().length >= 15) {
      suggestTimer.current = setTimeout(async () => {
        try {
          setLoadingSuggestions(true);
          const result = await apiFetch("/ai/suggest", {
            method: "POST",
            body: JSON.stringify({ text: val.trim(), serie: aiPlanSerie || undefined }),
          });
          setSuggestions(result as AiSuggestions);
        } catch {
          // silent — suggestions are non-critical
        } finally {
          setLoadingSuggestions(false);
        }
      }, 800);
    }
  };

  const appendToDescription = (text: string) => {
    setDescription(prev => {
      const trimmed = prev.trimEnd();
      if (trimmed.length === 0) return text;
      return trimmed + "\n" + text;
    });
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await upsertPlan({ date: selectedDate, description, tema });
      toast({ title: "Planejamento salvo!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (activityId: string) => {
    if (!selectedPlan) return;
    try {
      await unlinkActivity({ planId: selectedPlan.id, activityId });
    } catch {
      toast({ title: "Erro ao remover atividade", variant: "destructive" });
    }
  };

  const handleLinkExisting = async (activityId: string) => {
    if (!selectedDate) return;
    let planId = selectedPlan?.id;
    if (!planId) {
      const created = await upsertPlan({ date: selectedDate, description, tema }) as LessonPlan;
      planId = created.id;
    }
    try {
      await linkActivity({ planId, activityId });
      setLinkingActivity(false);
      toast({ title: "Atividade associada!" });
    } catch {
      toast({ title: "Erro ao associar atividade", variant: "destructive" });
    }
  };

  const handleCreateAndLink = async () => {
    if (!selectedDate || !newActivity.description.trim()) return;
    setSaving(true);
    try {
      const created = await createActivity({
        subject: newActivity.subject || (subjects?.[0]?.name ?? 'Geral'),
        type: newActivity.type,
        description: newActivity.description,
        date: selectedDate,
        link: newActivity.link || undefined,
      }) as Activity;

      let planId = selectedPlan?.id;
      if (!planId) {
        const plan = await upsertPlan({ date: selectedDate, description, tema }) as LessonPlan;
        planId = plan.id;
      }
      await linkActivity({ planId, activityId: created.id });
      setCreatingActivity(false);
      setNewActivity({ subject: '', type: 'homework', description: '', link: '' });
      toast({ title: "Atividade criada e associada!" });
    } catch {
      toast({ title: "Erro ao criar atividade", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const linkedActivities = useMemo(() => {
    if (!selectedPlan || !activities) return [];
    return selectedPlan.activityIds.map(id => activities.find(a => a.id === id)).filter(Boolean) as Activity[];
  }, [selectedPlan, activities]);

  const availableToLink = useMemo(() => {
    if (!activities) return [];
    const linked = new Set(selectedPlan?.activityIds ?? []);
    return activities.filter(a => !linked.has(a.id));
  }, [activities, selectedPlan]);

  const openAiPlanModal = () => {
    setAiPlanResult(null);
    if (tema) setAiPlanTema(tema);
    setAiPlanModal(true);
  };

  const handleGeneratePlan = async () => {
    if (!aiPlanSerie.trim()) {
      toast({ title: "Informe a série", variant: "destructive" });
      return;
    }
    setAiPlanLoading(true);
    setAiPlanResult(null);
    try {
      const result = await apiFetch("/ai/generate-plan", {
        method: "POST",
        body: JSON.stringify({
          mode: aiPlanMode,
          serie: aiPlanSerie,
          tipo: aiPlanTipo,
          disciplina: aiPlanDisciplina || undefined,
          tema: aiPlanTema || undefined,
        }),
      });
      setAiPlanResult(result as DayPlan | WeekPlan);
    } catch {
      toast({ title: "Erro ao gerar planejamento", description: "Verifique sua conexão e tente novamente.", variant: "destructive" });
    } finally {
      setAiPlanLoading(false);
    }
  };

  const applyDayPlan = async (plan: DayPlan, targetDate?: string) => {
    const date = targetDate ?? selectedDate;
    if (!date) return;
    const newDesc = [
      plan.objetivo && `Objetivo: ${plan.objetivo}`,
      plan.bncc?.codigo && `BNCC: ${plan.bncc.codigo} – ${plan.bncc.descricao}`,
      plan.descricao,
      plan.atividade && `Atividade: ${plan.atividade}`,
    ].filter(Boolean).join("\n\n");

    try {
      await upsertPlan({ date, description: newDesc, tema: plan.tema });
      if (date === selectedDate) {
        setDescription(newDesc);
        setTema(plan.tema);
      }
      toast({ title: "Planejamento aplicado!" });
    } catch {
      toast({ title: "Erro ao aplicar planejamento", variant: "destructive" });
    }
  };

  const applyWeekPlan = async () => {
    if (!selectedDate || !aiPlanResult || !("semana" in aiPlanResult)) return;
    const monday = getWeekMonday(parseISO(selectedDate));
    const semana = (aiPlanResult as { semana: WeekDayRegente[] | WeekDayDisciplina[] }).semana;

    let applied = 0;
    const failed: string[] = [];
    for (let i = 0; i < semana.length; i++) {
      const dia = semana[i];
      const date = toLocalISO(addDays(monday, i));
      let desc = "";
      let temaDay = "";

      if ("aulas" in dia) {
        const regenteDia = dia as WeekDayRegente;
        temaDay = regenteDia.aulas.map(a => a.tema).join(", ");
        desc = regenteDia.aulas.map(a =>
          [`[${a.disciplina}] ${a.tema}`, `Objetivo: ${a.objetivo}`, `BNCC: ${a.bncc.codigo} – ${a.bncc.descricao}`, a.descricao, `Atividade: ${a.atividade}`].join("\n")
        ).join("\n\n---\n\n");
      } else {
        const discDia = dia as WeekDayDisciplina;
        temaDay = discDia.tema;
        desc = [`Objetivo: ${discDia.objetivo}`, `BNCC: ${discDia.bncc.codigo} – ${discDia.bncc.descricao}`, discDia.descricao, `Atividade: ${discDia.atividade}`].join("\n\n");
      }

      try {
        await upsertPlan({ date, description: desc, tema: temaDay });
        applied++;
      } catch {
        failed.push(("dia" in dia ? (dia as WeekDayRegente | WeekDayDisciplina) : dia).toString());
      }
    }

    if (failed.length > 0 && applied === 0) {
      toast({ title: "Erro ao aplicar planejamento semanal", description: "Nenhum dia foi salvo. Tente novamente.", variant: "destructive" });
    } else if (failed.length > 0) {
      toast({ title: `${applied} de ${semana.length} dias salvos`, description: `${failed.length} dia(s) falharam. Verifique sua conexão.`, variant: "destructive" });
    } else {
      toast({ title: `Semana aplicada com sucesso!`, description: `${applied} dias de planejamento salvos.` });
    }
    setAiPlanModal(false);
    setAiPlanResult(null);
  };

  const handleGenerateActivity = async () => {
    if (!aiActivityDisciplina.trim() || !aiActivityTema.trim()) {
      toast({ title: "Informe a disciplina e o tema", variant: "destructive" });
      return;
    }
    setAiActivityLoading(true);
    setAiActivityResult(null);
    try {
      const result = await apiFetch("/ai/generate-activity", {
        method: "POST",
        body: JSON.stringify({
          serie: aiActivitySerie || undefined,
          disciplina: aiActivityDisciplina,
          tema: aiActivityTema,
        }),
      }) as GeneratedActivity;
      setAiActivityResult(result);
    } catch {
      toast({ title: "Erro ao gerar atividade", variant: "destructive" });
    } finally {
      setAiActivityLoading(false);
    }
  };

  const applyGeneratedActivity = () => {
    if (!aiActivityResult) return;
    const matchedSubject = subjects?.find(s =>
      s.name.toLowerCase().includes(aiActivityDisciplina.toLowerCase()) ||
      aiActivityDisciplina.toLowerCase().includes(s.name.toLowerCase())
    );
    setNewActivity({
      subject: matchedSubject?.name || aiActivityDisciplina,
      type: aiActivityResult.tipo,
      description: [
        aiActivityResult.titulo && `${aiActivityResult.titulo}\n`,
        aiActivityResult.descricao,
        aiActivityResult.bncc && `\nBNCC: ${aiActivityResult.bncc.codigo} – ${aiActivityResult.bncc.descricao}`,
      ].filter(Boolean).join(""),
      link: "",
    });
    setAiActivityModal(false);
    setAiActivityResult(null);
    setCreatingActivity(true);
    setLinkingActivity(false);
  };

  const isDayPlan = aiPlanResult && !("semana" in aiPlanResult);
  const isWeekPlan = aiPlanResult && "semana" in aiPlanResult;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left: Calendar */}
      <div className="w-80 min-w-[280px] border-r border-border/50 flex flex-col bg-sidebar/30 overflow-y-auto">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setSelectedDate(null); }} className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-display font-bold text-foreground capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <button onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setSelectedDate(null); }} className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-1">
            {plansLoading ? "Carregando..." : `${plans?.length ?? 0} dia(s) com planejamento`}
          </p>
        </div>

        <div className="p-3 flex-1">
          <div className="grid grid-cols-7 mb-2">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>
          <div className="space-y-1">
            {calendarWeeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-0.5">
                {week.map((day, di) => {
                  const inMonth = isSameMonth(day, currentMonth);
                  const dateStr = toLocalISO(day);
                  const hasPlan = !!plansByDate[dateStr];
                  const isSelected = selectedDate === dateStr;
                  const today = isToday(day);
                  return (
                    <button
                      key={di}
                      onClick={() => inMonth && handleSelectDay(day)}
                      disabled={!inMonth}
                      className={cn(
                        "relative flex flex-col items-center justify-center aspect-square rounded-xl text-sm font-semibold transition-all duration-150",
                        !inMonth && "opacity-20 cursor-default",
                        inMonth && !isSelected && "hover:bg-muted/60 cursor-pointer",
                        isSelected && "bg-primary text-primary-foreground shadow-md",
                        today && !isSelected && "ring-2 ring-primary/40 text-primary",
                        !isSelected && !today && inMonth && "text-foreground"
                      )}
                    >
                      <span className="text-xs">{format(day, "d")}</span>
                      {hasPlan && inMonth && (
                        <span className={cn("w-1.5 h-1.5 rounded-full mt-0.5", isSelected ? "bg-primary-foreground/70" : "bg-primary")} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Day Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selectedDate ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CalendarDays className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-3">Planejamento Diário</h2>
            <p className="text-muted-foreground max-w-sm">
              Selecione um dia no calendário à esquerda para visualizar ou criar o planejamento de aula.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-2xl">
            {/* Date header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground capitalize">
                  {format(parseISO(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {selectedPlan ? "Planejamento existente — edite e salve" : "Nenhum planejamento para este dia"}
                </p>
              </div>
              <button
                onClick={openAiPlanModal}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-purple-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Gerar com IA
              </button>
            </div>

            {/* Plan card */}
            <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Plano da Aula
              </h3>

              {/* Tema */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tema da aula</label>
                <input
                  value={tema}
                  onChange={e => setTema(e.target.value)}
                  placeholder="Ex: Frações no cotidiano, Ciclo da água..."
                  className="w-full px-4 py-2.5 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none transition-all text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Descrição</label>
                <textarea
                  value={description}
                  onChange={e => handleDescriptionChange(e.target.value)}
                  placeholder="Descreva os objetivos, conteúdos e metodologias previstas para este dia..."
                  rows={7}
                  className="w-full px-4 py-3 bg-background border-2 border-border/60 rounded-2xl focus:border-primary outline-none transition-all text-sm resize-none leading-relaxed"
                />

                {/* AI Suggestions */}
                {loadingSuggestions && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Buscando sugestões da BNCC...
                  </div>
                )}
                {suggestions && (suggestions.bncc.length > 0 || suggestions.objetivos.length > 0) && (
                  <div className="mt-3 space-y-2">
                    {suggestions.bncc.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Brain className="w-3 h-3" /> Habilidades BNCC sugeridas
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.bncc.map((b, i) => (
                            <button
                              key={i}
                              onClick={() => appendToDescription(`BNCC: ${b}`)}
                              className="px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors text-left"
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {suggestions.objetivos.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Wand2 className="w-3 h-3" /> Objetivos sugeridos
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.objetivos.map((o, i) => (
                            <button
                              key={i}
                              onClick={() => appendToDescription(`Objetivo: ${o}`)}
                              className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-left"
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">Clique numa sugestão para adicioná-la à descrição</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </div>

            {/* Activities */}
            <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Atividades do Dia
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setLinkingActivity(l => !l); setCreatingActivity(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted/40 hover:bg-muted/70 text-foreground transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Associar
                  </button>
                  <button
                    onClick={() => { setAiActivityResult(null); setAiActivityDisciplina(""); setAiActivityTema(tema || ""); setAiActivityModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:shadow-md transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Gerar com IA
                  </button>
                  <button
                    onClick={() => { setCreatingActivity(c => !c); setLinkingActivity(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova
                  </button>
                </div>
              </div>

              {linkingActivity && (
                <div className="mb-4 p-3 bg-muted/20 rounded-2xl border border-border/40">
                  <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Selecionar atividade existente</p>
                  {availableToLink.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Todas as atividades já estão associadas ou não há atividades cadastradas.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {availableToLink.map(a => (
                        <button key={a.id} onClick={() => handleLinkExisting(a.id)} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors flex items-start gap-3 group">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5", a.type === 'homework' ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary")}>
                            {a.type === 'homework' ? 'Casa' : 'Sala'}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{a.subject}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setLinkingActivity(false)} className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
                </div>
              )}

              {creatingActivity && (
                <div className="mb-4 p-4 bg-muted/20 rounded-2xl border border-border/40 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nova atividade</p>
                  <div className="flex flex-wrap gap-2">
                    {subjects?.map(sub => (
                      <button key={sub.id} onClick={() => setNewActivity(a => ({ ...a, subject: sub.name }))}
                        className={cn("px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                          newActivity.subject === sub.name || (!newActivity.subject && sub.id === subjects[0]?.id)
                            ? "bg-primary text-primary-foreground" : "bg-muted/40 text-foreground hover:bg-muted/70"
                        )}>
                        {sub.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setNewActivity(a => ({ ...a, type: 'homework' }))} className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors", newActivity.type === 'homework' ? "bg-accent/30 text-accent-foreground" : "bg-muted/30 text-muted-foreground")}>Para casa</button>
                    <button onClick={() => setNewActivity(a => ({ ...a, type: 'classwork' }))} className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors", newActivity.type === 'classwork' ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground")}>Em sala</button>
                  </div>
                  <textarea placeholder="Descrição da atividade..." rows={3} value={newActivity.description} onChange={e => setNewActivity(a => ({ ...a, description: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/60 rounded-xl focus:border-primary outline-none text-sm resize-none" />
                  <input placeholder="Link (opcional)" type="url" value={newActivity.link} onChange={e => setNewActivity(a => ({ ...a, link: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border/60 rounded-xl focus:border-primary outline-none text-sm" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setCreatingActivity(false)} className="px-4 py-2 text-sm rounded-lg bg-muted/40 text-foreground hover:bg-muted/70 transition-colors font-medium">Cancelar</button>
                    <button onClick={handleCreateAndLink} disabled={!newActivity.description.trim() || saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold disabled:opacity-60">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Criar e associar"}
                    </button>
                  </div>
                </div>
              )}

              {linkedActivities.length === 0 && !linkingActivity && !creatingActivity ? (
                <div className="text-center py-6">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma atividade associada a este dia</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedActivities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/10 group">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5", activity.type === 'homework' ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary")}>
                        {activity.type === 'homework' ? 'Casa' : 'Sala'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{activity.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{activity.description}</p>
                      </div>
                      <button onClick={() => handleUnlink(activity.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground" title="Desassociar atividade">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Plan Modal */}
      {aiPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border/50 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-display font-bold text-foreground">Gerar Planejamento com IA</h2>
                </div>
                <button onClick={() => { setAiPlanModal(false); setAiPlanResult(null); }} className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!aiPlanResult ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Modo</label>
                    <div className="flex gap-2">
                      {(["day", "week"] as const).map(m => (
                        <button key={m} onClick={() => setAiPlanMode(m)} className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-colors", aiPlanMode === m ? "bg-primary text-primary-foreground" : "bg-muted/40 text-foreground hover:bg-muted/70")}>
                          {m === "day" ? "Plano do dia" : "Semana inteira"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Série *</label>
                    <input value={aiPlanSerie} onChange={e => setAiPlanSerie(e.target.value)} placeholder="Ex: 3º ano, 5º ano, 8º ano..." className="w-full px-4 py-2.5 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tipo de professor</label>
                    <div className="flex gap-2">
                      {(["regente", "disciplina"] as const).map(t => (
                        <button key={t} onClick={() => setAiPlanTipo(t)} className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-colors", aiPlanTipo === t ? "bg-primary text-primary-foreground" : "bg-muted/40 text-foreground hover:bg-muted/70")}>
                          {t === "regente" ? "Regente" : "Disciplina específica"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {aiPlanTipo === "disciplina" && (
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Disciplina</label>
                      <input value={aiPlanDisciplina} onChange={e => setAiPlanDisciplina(e.target.value)} placeholder="Ex: Matemática, Português, Ciências..." className="w-full px-4 py-2.5 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none transition-all text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tema {aiPlanMode === "week" ? "geral" : ""} (opcional)</label>
                    <input value={aiPlanTema} onChange={e => setAiPlanTema(e.target.value)} placeholder="Ex: Meio ambiente, Números decimais..." className="w-full px-4 py-2.5 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none transition-all text-sm" />
                  </div>
                  <button onClick={handleGeneratePlan} disabled={aiPlanLoading || !aiPlanSerie.trim()} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-sm shadow-md disabled:opacity-60 hover:shadow-lg transition-all">
                    {aiPlanLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar planejamento</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {isDayPlan && (
                    <div className="space-y-3">
                      <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-2xl border border-violet-200 dark:border-violet-800">
                        <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-1">Tema</p>
                        <p className="text-sm font-semibold text-foreground">{(aiPlanResult as DayPlan).tema}</p>
                      </div>
                      <div className="p-4 bg-muted/20 rounded-2xl border border-border/40 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Objetivo</p>
                          <p className="text-sm text-foreground mt-0.5">{(aiPlanResult as DayPlan).objetivo}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">BNCC</p>
                          <p className="text-sm text-foreground mt-0.5"><span className="font-bold text-primary">{(aiPlanResult as DayPlan).bncc.codigo}</span> – {(aiPlanResult as DayPlan).bncc.descricao}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Descrição da aula</p>
                          <p className="text-sm text-foreground mt-0.5">{(aiPlanResult as DayPlan).descricao}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Atividade sugerida</p>
                          <p className="text-sm text-foreground mt-0.5">{(aiPlanResult as DayPlan).atividade}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isWeekPlan && (
                    <div className="space-y-3">
                      {((aiPlanResult as { semana: WeekDayRegente[] | WeekDayDisciplina[] }).semana).map((dia, i) => (
                        <div key={i} className="p-4 bg-muted/20 rounded-2xl border border-border/40">
                          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">{"dia" in dia ? dia.dia : DIAS_SEMANA[i]}</p>
                          {"aulas" in dia ? (
                            <div className="space-y-2">
                              {(dia as WeekDayRegente).aulas.map((aula, j) => (
                                <div key={j} className="text-sm">
                                  <span className="font-bold">{aula.disciplina}</span> — {aula.tema}
                                  <p className="text-xs text-muted-foreground mt-0.5">{aula.objetivo}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm">
                              <p className="font-semibold">{(dia as WeekDayDisciplina).tema}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{(dia as WeekDayDisciplina).objetivo}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setAiPlanResult(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-muted/40 hover:bg-muted/70 text-foreground transition-colors">
                      ← Refazer
                    </button>
                    {isDayPlan && selectedDate && (
                      <button onClick={() => { applyDayPlan(aiPlanResult as DayPlan); setAiPlanModal(false); setAiPlanResult(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-all">
                        Aplicar ao dia
                      </button>
                    )}
                    {isWeekPlan && selectedDate && (
                      <button onClick={applyWeekPlan} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-all">
                        Aplicar à semana
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Activity Modal */}
      {aiActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border/50 rounded-3xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-display font-bold text-foreground">Gerar Atividade com IA</h2>
                </div>
                <button onClick={() => { setAiActivityModal(false); setAiActivityResult(null); }} className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!aiActivityResult ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Série (opcional)</label>
                    <input value={aiActivitySerie} onChange={e => setAiActivitySerie(e.target.value)} placeholder="Ex: 4º ano, 6º ano..." className="w-full px-4 py-2.5 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Disciplina *</label>
                    <input value={aiActivityDisciplina} onChange={e => setAiActivityDisciplina(e.target.value)} placeholder="Ex: Matemática, Português..." className="w-full px-4 py-2.5 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tema *</label>
                    <input value={aiActivityTema} onChange={e => setAiActivityTema(e.target.value)} placeholder="Ex: Multiplicação, Leitura e interpretação..." className="w-full px-4 py-2.5 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none transition-all text-sm" />
                  </div>
                  <button onClick={handleGenerateActivity} disabled={aiActivityLoading || !aiActivityDisciplina.trim() || !aiActivityTema.trim()} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-sm shadow-md disabled:opacity-60 hover:shadow-lg transition-all">
                    {aiActivityLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4" /> Gerar atividade</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-2xl border border-violet-200 dark:border-violet-800 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Título</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{aiActivityResult.titulo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Descrição</p>
                      <p className="text-sm text-foreground mt-0.5 leading-relaxed">{aiActivityResult.descricao}</p>
                    </div>
                    {aiActivityResult.bncc && (
                      <div>
                        <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">BNCC</p>
                        <p className="text-sm text-foreground mt-0.5"><span className="font-bold text-primary">{aiActivityResult.bncc.codigo}</span> – {aiActivityResult.bncc.descricao}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAiActivityResult(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-muted/40 hover:bg-muted/70 text-foreground transition-colors">
                      ← Refazer
                    </button>
                    <button onClick={applyGeneratedActivity} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-all">
                      Usar esta atividade
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
