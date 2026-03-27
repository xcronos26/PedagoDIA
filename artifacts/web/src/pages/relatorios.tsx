import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudents } from "@/hooks/use-students";
import { useAllAttendance } from "@/hooks/use-attendance";
import { useActivities } from "@/hooks/use-activities";
import { useAllDeliveries } from "@/hooks/use-deliveries";
import { BarChart3, TrendingUp, CheckCircle2, XCircle, Search, User as UserIcon, BookOpen } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Relatorios() {
  const { data: students, isLoading: l1 } = useStudents();
  const { data: attendance, isLoading: l2 } = useAllAttendance();
  const { data: activities, isLoading: l3 } = useActivities();
  const { data: deliveries, isLoading: l4 } = useAllDeliveries();
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [search, setSearch] = useState("");

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [students, search]);

  const selectedStudent = useMemo(() => {
    return students?.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const stats = useMemo(() => {
    if (!selectedStudentId || !attendance || !activities || !deliveries) return null;

    // Attendance stats
    const studentAttendance = attendance.filter(a => a.studentId === selectedStudentId);
    const totalDays = studentAttendance.length;
    const presentDays = studentAttendance.filter(a => a.present).length;
    const absentDays = totalDays - presentDays;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Activity stats
    const totalActivities = activities.length;
    const studentDeliveries = deliveries.filter(d => d.studentId === selectedStudentId && d.delivered);
    const deliveredCount = studentDeliveries.length;
    const activityPercentage = totalActivities > 0 ? Math.round((deliveredCount / totalActivities) * 100) : 0;

    return {
      attendance: { total: totalDays, present: presentDays, absent: absentDays, percentage: attendancePercentage },
      activities: { total: totalActivities, delivered: deliveredCount, percentage: activityPercentage }
    };
  }, [selectedStudentId, attendance, activities, deliveries]);

  const isLoading = l1 || l2 || l3 || l4;

  return (
    <div className="flex flex-col md:flex-row h-screen pt-16 md:pt-0 overflow-hidden bg-background">
      
      {/* Student Sidebar List */}
      <div className="w-full md:w-80 flex-shrink-0 border-r border-border bg-card flex flex-col h-[40vh] md:h-full z-10 shadow-xl md:shadow-none">
        <div className="p-4 border-b border-border/50 bg-card">
          <h2 className="text-xl font-display font-bold text-foreground mb-4">Relatórios</h2>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border-2 border-border/60 rounded-xl focus:border-primary outline-none shadow-sm transition-all text-sm font-medium"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            filteredStudents.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group",
                  selectedStudentId === student.id 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                  selectedStudentId === student.id ? "bg-white/20 text-white" : "bg-secondary text-secondary-foreground"
                )}>
                  {student.name.charAt(0)}
                </div>
                <span className="font-bold flex-1 truncate">{student.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto bg-secondary/20 p-4 md:p-8 custom-scrollbar">
        {!selectedStudent || !stats ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-slide-up">
            <div className="bg-primary/10 p-6 rounded-full text-primary mb-6">
              <BarChart3 className="w-16 h-16" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Selecione um Aluno</h2>
            <p className="text-muted-foreground max-w-sm text-lg">
              Escolha um aluno na lista ao lado para visualizar seu desempenho completo de frequência e atividades.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-display font-bold text-4xl shadow-xl shadow-primary/20">
                {selectedStudent.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-display font-extrabold text-foreground">{selectedStudent.name}</h1>
                <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
                  <UserIcon className="w-4 h-4" /> Aluno(a)
                </p>
              </div>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Frequência Card */}
              <div className="bg-card rounded-3xl p-6 shadow-sm border border-border/50">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Frequência Escolar
                </h3>
                <div className="flex items-center gap-8">
                  <div className="w-32 h-32 relative shrink-0">
                    {stats.attendance.total > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Presenças', value: stats.attendance.present },
                              { name: 'Faltas', value: stats.attendance.absent }
                            ]}
                            cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                            paddingAngle={5} dataKey="value" stroke="none"
                          >
                            <Cell fill="hsl(var(--success))" />
                            <Cell fill="hsl(var(--destructive))" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full rounded-full border-8 border-muted flex items-center justify-center text-muted-foreground font-bold">SD</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-xl font-display font-bold text-foreground">{stats.attendance.percentage}%</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-sm font-bold text-muted-foreground">Total de Aulas</p>
                      <p className="text-2xl font-bold text-foreground">{stats.attendance.total}</p>
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs font-bold text-success uppercase tracking-wider">Presenças</p>
                        <p className="text-xl font-bold">{stats.attendance.present}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-destructive uppercase tracking-wider">Faltas</p>
                        <p className="text-xl font-bold">{stats.attendance.absent}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Atividades Card */}
              <div className="bg-card rounded-3xl p-6 shadow-sm border border-border/50">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" /> Entrega de Atividades
                </h3>
                <div className="flex items-center gap-8">
                  <div className="w-32 h-32 relative shrink-0">
                    {stats.activities.total > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Entregues', value: stats.activities.delivered },
                              { name: 'Pendentes', value: stats.activities.total - stats.activities.delivered }
                            ]}
                            cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                            paddingAngle={5} dataKey="value" stroke="none"
                          >
                            <Cell fill="hsl(var(--primary))" />
                            <Cell fill="hsl(var(--muted))" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full rounded-full border-8 border-muted flex items-center justify-center text-muted-foreground font-bold">SD</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-xl font-display font-bold text-foreground">{stats.activities.percentage}%</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-sm font-bold text-muted-foreground">Total Atribuído</p>
                      <p className="text-2xl font-bold text-foreground">{stats.activities.total}</p>
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs font-bold text-primary uppercase tracking-wider">Entregues</p>
                        <p className="text-xl font-bold">{stats.activities.delivered}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pendentes</p>
                        <p className="text-xl font-bold">{stats.activities.total - stats.activities.delivered}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Activities Detailed List */}
            <div className="bg-card rounded-3xl p-6 shadow-sm border border-border/50">
              <h3 className="text-xl font-display font-bold text-foreground mb-6">Histórico de Atividades</h3>
              
              {!activities?.length ? (
                <p className="text-muted-foreground p-4 text-center bg-muted/20 rounded-xl">Nenhuma atividade registrada.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map(activity => {
                    const delivery = deliveries?.find(d => d.activityId === activity.id && d.studentId === selectedStudentId);
                    const isDelivered = delivery?.delivered;

                    return (
                      <div key={activity.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/10 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              activity.type === 'homework' ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"
                            )}>
                              {activity.type === 'homework' ? 'Casa' : 'Sala'}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">
                              {format(new Date(activity.date), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <p className="font-bold text-foreground">{activity.subject}</p>
                        </div>
                        
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm",
                          isDelivered ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                        )}>
                          {isDelivered ? (
                            <><CheckCircle2 className="w-5 h-5" /> Entregue</>
                          ) : (
                            <><XCircle className="w-5 h-5" /> Pendente</>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
