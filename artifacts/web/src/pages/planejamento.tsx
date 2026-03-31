import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, BookOpen, Plus, Trash2, X, Save, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLessonPlans, useUpsertLessonPlan, useLinkActivity, useUnlinkActivity, type LessonPlan } from "@/hooks/use-lesson-plans";
import { useActivities, useCreateActivity, type Activity } from "@/hooks/use-activities";
import { useSubjects, type Subject } from "@/hooks/use-subjects";
import { useToast } from "@/hooks/use-toast";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

export default function Planejamento() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [linkingActivity, setLinkingActivity] = useState(false);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [newActivity, setNewActivity] = useState<{ subject: string; type: 'homework' | 'classwork'; description: string; link: string }>({ subject: '', type: 'homework', description: '', link: '' });
  const [saving, setSaving] = useState(false);

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
  }, [selectedDate, selectedPlan?.id]);

  const calendarWeeks = useMemo(() => getCalendarWeeks(currentMonth), [currentMonth]);

  const handleSelectDay = useCallback((date: Date) => {
    const dateStr = toLocalISO(date);
    setSelectedDate(dateStr);
    setLinkingActivity(false);
    setCreatingActivity(false);
  }, []);

  const handleSave = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      await upsertPlan({ date: selectedDate, description });
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
      const created = await upsertPlan({ date: selectedDate, description }) as LessonPlan;
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
        const plan = await upsertPlan({ date: selectedDate, description }) as LessonPlan;
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left: Calendar Panel */}
      <div className="w-80 min-w-[280px] border-r border-border/50 flex flex-col bg-sidebar/30 overflow-y-auto">
        {/* Month navigation */}
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setSelectedDate(null); }}
              className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-display font-bold text-foreground capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <button
              onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setSelectedDate(null); }}
              className="p-2 rounded-xl hover:bg-muted/60 text-muted-foreground transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-1">
            {plansLoading ? "Carregando..." : `${plans?.length ?? 0} dia(s) com planejamento`}
          </p>
        </div>

        {/* Calendar Grid */}
        <div className="p-3 flex-1">
          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
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
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full mt-0.5",
                          isSelected ? "bg-primary-foreground/70" : "bg-primary"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Day Detail Panel */}
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
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground capitalize">
                {format(parseISO(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {selectedPlan ? "Planejamento existente — edite e salve" : "Nenhum planejamento para este dia"}
              </p>
            </div>

            {/* Description */}
            <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Descritivo da Aula
              </h3>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva os objetivos, conteúdos e metodologias previstas para este dia..."
                rows={8}
                className="w-full px-4 py-3 bg-background border-2 border-border/60 rounded-2xl focus:border-primary outline-none transition-all text-sm resize-none leading-relaxed"
              />
              <div className="flex justify-end mt-3">
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
                    onClick={() => { setCreatingActivity(c => !c); setLinkingActivity(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova atividade
                  </button>
                </div>
              </div>

              {/* Link existing activity dropdown */}
              {linkingActivity && (
                <div className="mb-4 p-3 bg-muted/20 rounded-2xl border border-border/40">
                  <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Selecionar atividade existente</p>
                  {availableToLink.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Todas as atividades já estão associadas ou não há atividades cadastradas.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {availableToLink.map(a => (
                        <button
                          key={a.id}
                          onClick={() => handleLinkExisting(a.id)}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors flex items-start gap-3 group"
                        >
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5",
                            a.type === 'homework' ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"
                          )}>
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

              {/* Create new activity inline */}
              {creatingActivity && (
                <div className="mb-4 p-4 bg-muted/20 rounded-2xl border border-border/40 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nova atividade</p>
                  <div className="flex gap-2">
                    {subjects?.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setNewActivity(a => ({ ...a, subject: sub.name }))}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                          newActivity.subject === sub.name || (!newActivity.subject && sub.id === subjects[0]?.id)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/40 text-foreground hover:bg-muted/70"
                        )}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewActivity(a => ({ ...a, type: 'homework' }))}
                      className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors", newActivity.type === 'homework' ? "bg-accent/30 text-accent-foreground" : "bg-muted/30 text-muted-foreground")}
                    >Para casa</button>
                    <button
                      onClick={() => setNewActivity(a => ({ ...a, type: 'classwork' }))}
                      className={cn("flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors", newActivity.type === 'classwork' ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground")}
                    >Em sala</button>
                  </div>
                  <textarea
                    placeholder="Descrição da atividade..."
                    rows={3}
                    value={newActivity.description}
                    onChange={e => setNewActivity(a => ({ ...a, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-xl focus:border-primary outline-none text-sm resize-none"
                  />
                  <input
                    placeholder="Link (opcional)"
                    type="url"
                    value={newActivity.link}
                    onChange={e => setNewActivity(a => ({ ...a, link: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-xl focus:border-primary outline-none text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setCreatingActivity(false)} className="px-4 py-2 text-sm rounded-lg bg-muted/40 text-foreground hover:bg-muted/70 transition-colors font-medium">Cancelar</button>
                    <button
                      onClick={handleCreateAndLink}
                      disabled={!newActivity.description.trim() || saving}
                      className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Criar e associar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Linked activities list */}
              {linkedActivities.length === 0 && !linkingActivity && !creatingActivity ? (
                <div className="text-center py-6">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma atividade associada a este dia</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedActivities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/10 group">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5",
                        activity.type === 'homework' ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"
                      )}>
                        {activity.type === 'homework' ? 'Casa' : 'Sala'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{activity.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{activity.description}</p>
                      </div>
                      <button
                        onClick={() => handleUnlink(activity.id)}
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground"
                        title="Desassociar atividade"
                      >
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
    </div>
  );
}
