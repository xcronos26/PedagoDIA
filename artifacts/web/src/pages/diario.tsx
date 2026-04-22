import React, { useState, useMemo } from "react";
import { format, addDays, startOfWeek, subWeeks, addWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudents } from "@/hooks/use-students";
import { useAllAttendance, useToggleAttendance } from "@/hooks/use-attendance";
import { ClassFilter } from "@/components/class-filter";
import { ChevronLeft, ChevronRight, Check, X, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getStoredClass() {
  return localStorage.getItem('pedagogia_class_filter') || null;
}

export default function Diario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [classFilter, setClassFilter] = useState<string | null>(getStoredClass);
  const { data: students, isLoading: loadingStudents } = useStudents(classFilter);
  const { data: attendance, isLoading: loadingAttendance } = useAllAttendance();
  const { mutate: toggleAttendance } = useToggleAttendance();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const handlePrevWeek = () => setCurrentDate(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentDate(prev => addWeeks(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleClassChange = (id: string | null) => {
    setClassFilter(id);
    if (id) localStorage.setItem('pedagogia_class_filter', id);
    else localStorage.removeItem('pedagogia_class_filter');
  };

  const getAttendanceStatus = (studentId: string, dateStr: string) => {
    if (!attendance) return undefined;
    const record = attendance.find(a => a.studentId === studentId && a.date === dateStr);
    return record?.present;
  };

  const handleCellClick = (studentId: string, date: Date, currentStatus?: boolean) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const nextStatus = currentStatus === undefined ? true : !currentStatus;
    toggleAttendance({ studentId, date: dateStr, present: nextStatus });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-foreground">Diário de Classe</h1>
          <p className="text-muted-foreground mt-1">Visão semanal da frequência dos alunos.</p>
        </div>

        <div className="flex items-center gap-2 bg-card p-2 rounded-2xl shadow-sm border border-border/50">
          <button onClick={handlePrevWeek} className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={handleToday} className="px-4 py-2 font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Hoje</span>
          </button>
          <div className="px-4 font-bold text-foreground text-center min-w-[140px]">
            {format(weekStart, "dd 'de' MMM", { locale: ptBR })} - {format(weekDays[4], "dd 'de' MMM", { locale: ptBR })}
          </div>
          <button onClick={handleNextWeek} className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Class Filter */}
      <ClassFilter value={classFilter} onChange={handleClassChange} />

      {/* Main Grid */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        {(loadingStudents || loadingAttendance) ? (
          <div className="p-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Carregando diário...</p>
          </div>
        ) : !students?.length ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>
              {classFilter
                ? "Nenhum aluno nesta turma. Vá até a Chamada para adicionar alunos."
                : "Nenhum aluno cadastrado. Vá até a aba Chamada para adicionar alunos."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr>
                <th className="p-4 font-bold text-muted-foreground border-b border-r border-border/50 bg-muted/20 w-1/4 sticky left-0 z-10 bg-card">
                  Aluno
                </th>
                {weekDays.map(day => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <th key={day.toISOString()} className={cn(
                      "p-3 text-center border-b border-border/50 bg-muted/20 w-[15%]",
                      isToday ? "bg-primary/5 border-b-primary" : ""
                    )}>
                      <div className="font-bold text-foreground capitalize">
                        {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
                      </div>
                      <div className={cn(
                        "text-sm mt-1 inline-block px-2 py-0.5 rounded-md",
                        isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                      )}>
                        {format(day, 'dd/MM')}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {students.map((student, i) => (
                <tr key={student.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="p-4 font-semibold text-foreground border-r border-border/50 sticky left-0 z-10 bg-card group-hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}.</span>
                      <span className="truncate">{student.name}</span>
                    </div>
                  </td>
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const status = getAttendanceStatus(student.id, dateStr);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <td key={dateStr} className={cn(
                        "p-2 text-center transition-colors border-r border-border/10 last:border-r-0",
                        isToday ? "bg-primary/5" : ""
                      )}>
                        <button
                          onClick={() => handleCellClick(student.id, day, status)}
                          className={cn(
                            "w-full h-12 flex items-center justify-center rounded-xl transition-all duration-200 border-2",
                            status === true ? "bg-success/15 border-success text-success shadow-inner" :
                            status === false ? "bg-destructive/15 border-destructive text-destructive shadow-inner" :
                            "bg-transparent border-transparent hover:border-border text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          {status === true && <Check className="w-6 h-6 stroke-[3px]" />}
                          {status === false && <X className="w-6 h-6 stroke-[3px]" />}
                          {status === undefined && <span className="text-xs font-bold">-</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
