import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent } from "@/hooks/use-students";
import { useAttendanceByDate, useToggleAttendance } from "@/hooks/use-attendance";
import { Plus, Check, X, Calendar as CalendarIcon, UserPlus, Search, Edit2, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Chamada() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState("");
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: attendance, isLoading: loadingAttendance } = useAttendanceByDate(date);
  
  const { mutate: toggleAttendance } = useToggleAttendance();
  const { mutate: createStudent, isPending: creatingStudent } = useCreateStudent();
  const { mutate: updateStudent } = useUpdateStudent();
  const { mutate: deleteStudent } = useDeleteStudent();
  const { toast } = useToast();

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [students, search]);

  const stats = useMemo(() => {
    if (!students || !attendance) return { present: 0, absent: 0, total: 0 };
    let present = 0;
    let absent = 0;
    attendance.forEach(a => {
      if (a.present) present++;
      else absent++;
    });
    return { present, absent, total: students.length };
  }, [students, attendance]);

  const handleToggle = (studentId: string, present: boolean) => {
    toggleAttendance({ studentId, date, present });
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    createStudent({ name: newStudentName.trim() }, {
      onSuccess: () => {
        setNewStudentName("");
        setIsAddStudentOpen(false);
        toast({ title: "Aluno adicionado com sucesso!" });
      },
      onError: (err) => {
        toast({ title: "Erro ao adicionar aluno", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o aluno(a) ${name}? O histórico também será apagado.`)) {
      deleteStudent(id, {
        onSuccess: () => toast({ title: "Aluno excluído." })
      });
    }
  };

  const handleEditStudent = (id: string, oldName: string) => {
    const newName = prompt("Novo nome:", oldName);
    if (newName && newName.trim() !== oldName) {
      updateStudent({ id, name: newName.trim() }, {
        onSuccess: () => toast({ title: "Nome atualizado." })
      });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-slide-up">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-foreground">Chamada</h1>
          <p className="text-muted-foreground mt-1">Registre a presença diária da sua turma.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <CalendarIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="pl-10 pr-4 py-3 bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none w-full font-bold text-foreground shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsAddStudentOpen(true)}
            className="bg-primary text-primary-foreground p-3 rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
            title="Adicionar Aluno"
          >
            <UserPlus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider">Total</p>
          <p className="text-3xl font-display font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-success/10 border border-success/20 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-success mb-1 uppercase tracking-wider">Presentes</p>
          <p className="text-3xl font-display font-bold text-success">{stats.present}</p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-bold text-destructive mb-1 uppercase tracking-wider">Faltas</p>
          <p className="text-3xl font-display font-bold text-destructive">{stats.absent}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar aluno..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-card border-2 border-border/50 rounded-xl focus:border-primary outline-none shadow-sm transition-all"
        />
      </div>

      {/* Student List */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        {(loadingStudents || loadingAttendance) ? (
          <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Carregando turma...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <img src={`${import.meta.env.BASE_URL}images/empty-state.png`} alt="Nenhum aluno" className="w-48 h-48 mb-6 opacity-80" />
            <h3 className="text-xl font-bold text-foreground mb-2">Nenhum aluno encontrado</h3>
            <p className="text-muted-foreground max-w-sm">
              Adicione alunos clicando no botão de "+" no topo da tela para começar a registrar a chamada.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredStudents.map((student, index) => {
              const record = attendance?.find(a => a.studentId === student.id);
              const isPresent = record?.present === true;
              const isAbsent = record?.present === false;

              return (
                <div key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-lg">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-lg text-foreground flex-1">{student.name}</span>
                    
                    <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity focus-within:opacity-100 sm:mr-4">
                      <button onClick={() => handleEditStudent(student.id, student.name)} className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteStudent(student.id, student.name)} className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto bg-muted/30 p-1.5 rounded-xl">
                    <button
                      onClick={() => handleToggle(student.id, true)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all duration-200",
                        isPresent 
                          ? "bg-success text-success-foreground shadow-md shadow-success/20 scale-105" 
                          : "bg-transparent text-muted-foreground hover:bg-success/10 hover:text-success"
                      )}
                    >
                      <Check className={cn("w-5 h-5", isPresent ? "stroke-[3px]" : "")} />
                      <span className="hidden sm:inline">Presente</span>
                    </button>
                    <button
                      onClick={() => handleToggle(student.id, false)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold transition-all duration-200",
                        isAbsent 
                          ? "bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 scale-105" 
                          : "bg-transparent text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      )}
                    >
                      <X className={cn("w-5 h-5", isAbsent ? "stroke-[3px]" : "")} />
                      <span className="hidden sm:inline">Falta</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-2xl font-display font-bold text-foreground">Novo Aluno</h2>
            </div>
            <form onSubmit={handleAddStudent} className="p-6">
              <label className="block text-sm font-bold text-foreground mb-2">Nome Completo</label>
              <input
                autoFocus
                type="text"
                required
                value={newStudentName}
                onChange={e => setNewStudentName(e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-foreground font-medium"
                placeholder="Ex: João da Silva"
              />
              <div className="mt-8 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingStudent}
                  className="px-6 py-3 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingStudent && <Loader2 className="w-5 h-5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
