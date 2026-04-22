import React, { useState, useEffect, useRef } from "react";
import { useAuth, type WeeklySchedule } from "@/hooks/use-auth";
import { User, Mail, Save, Loader2, Check, CalendarDays, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DAYS: { key: keyof WeeklySchedule; label: string }[] = [
  { key: "segunda", label: "Segunda-feira" },
  { key: "terca", label: "Terça-feira" },
  { key: "quarta", label: "Quarta-feira" },
  { key: "quinta", label: "Quinta-feira" },
  { key: "sexta", label: "Sexta-feira" },
];

const SUBJECT_SUGGESTIONS = [
  "Português", "Matemática", "Ciências", "História", "Geografia",
  "Artes", "Educação Física", "Inglês", "Religião", "Informática",
];

const EMPTY_SCHEDULE: WeeklySchedule = {
  segunda: [], terca: [], quarta: [], quinta: [], sexta: [],
};

function scheduleIsEmpty(s: WeeklySchedule) {
  return DAYS.every(d => s[d.key].length === 0);
}

function DaySubjectEditor({
  day,
  subjects,
  onChange,
}: {
  day: { key: keyof WeeklySchedule; label: string };
  subjects: string[];
  onChange: (subjects: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addSubject = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (subjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...subjects, trimmed]);
    setInput("");
  };

  const removeSubject = (idx: number) => {
    onChange(subjects.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubject(input);
    }
  };

  const filteredSuggestions = SUBJECT_SUGGESTIONS.filter(
    s => !subjects.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground">{day.label}</p>
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {subjects.map((s, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold"
          >
            {s}
            <button
              type="button"
              onClick={() => removeSubject(i)}
              className="hover:text-destructive transition-colors"
              aria-label={`Remover ${s}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {subjects.length === 0 && (
          <span className="text-xs text-muted-foreground italic">Nenhuma matéria</span>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar matéria..."
          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-foreground transition-all"
          list={`suggestions-${day.key}`}
        />
        <datalist id={`suggestions-${day.key}`}>
          {filteredSuggestions.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => addSubject(input)}
          disabled={!input.trim()}
          className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          aria-label="Adicionar"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {input.trim() && filteredSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filteredSuggestions.slice(0, 5).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { addSubject(s); inputRef.current?.focus(); }}
              className="text-xs px-2 py-0.5 border border-border rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Perfil() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    user?.weeklySchedule ?? EMPTY_SCHEDULE
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.weeklySchedule) setSchedule(user.weeklySchedule);
    else setSchedule(EMPTY_SCHEDULE);
  }, [user?.name, user?.weeklySchedule]);

  const hasNameChange = name.trim() !== "" && name.trim() !== user?.name;
  const hasScheduleChange = JSON.stringify(schedule) !== JSON.stringify(user?.weeklySchedule ?? EMPTY_SCHEDULE);
  const hasChanges = hasNameChange || hasScheduleChange;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hasChanges) return;
    setIsSaving(true);
    try {
      const scheduleToSave = scheduleIsEmpty(schedule) ? null : schedule;
      await updateProfile(name.trim(), scheduleToSave);
      setSaved(true);
      toast({ title: "Perfil atualizado com sucesso!" });
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tente novamente.";
      toast({
        title: "Erro ao salvar perfil",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateDaySubjects = (key: keyof WeeklySchedule, subjects: string[]) => {
    setSchedule(prev => ({ ...prev, [key]: subjects }));
  };

  const clearSchedule = () => {
    setSchedule(EMPTY_SCHEDULE);
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-display font-extrabold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações de conta.</p>
      </div>

      <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display font-bold text-4xl shrink-0">
          {(user?.name ?? "P").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xl font-display font-bold text-foreground">{user?.name}</p>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-display font-bold text-foreground">Editar Informações</h2>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-foreground font-medium transition-all"
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" />
              E-mail
              <span className="text-xs font-normal">(não editável)</span>
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full px-4 py-3 bg-muted/50 border-2 border-border/50 rounded-xl text-muted-foreground font-medium cursor-not-allowed"
            />
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Grade Semanal
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Opcional — informe quais matérias você dá em cada dia para que a IA monte o plano semanal respeitando sua grade.
              </p>
            </div>
            {!scheduleIsEmpty(schedule) && (
              <button
                type="button"
                onClick={clearSchedule}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                Limpar tudo
              </button>
            )}
          </div>

          <div className="divide-y divide-border/60 space-y-0">
            {DAYS.map((day, i) => (
              <div key={day.key} className={cn("py-4", i === 0 && "pt-0", i === DAYS.length - 1 && "pb-0")}>
                <DaySubjectEditor
                  day={day}
                  subjects={schedule[day.key]}
                  onChange={(subjects) => updateDaySubjects(day.key, subjects)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
              saved
                ? "bg-success text-success-foreground"
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5",
              (isSaving || !hasChanges) && "opacity-50 cursor-not-allowed hover:translate-y-0"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <Check className="w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saved ? "Salvo!" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
