import React, { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudents } from "@/hooks/use-students";
import { useAllAttendance } from "@/hooks/use-attendance";
import { useActivities } from "@/hooks/use-activities";
import { useAllDeliveries } from "@/hooks/use-deliveries";
import { useJustifyAbsence } from "@/hooks/use-attendance";
import { useGenerateParentToken } from "@/hooks/use-parent-token";
import { BarChart3, TrendingUp, CheckCircle2, XCircle, Search, User as UserIcon, BookOpen, Calendar, AlertCircle, Edit3, Eye, FileText, Link as LinkIcon, ExternalLink, Share2, Copy } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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
  const justifyAbsence = useJustifyAbsence();
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [justificationModal, setJustificationModal] = useState<{
    studentId: string;
    date: string;
    currentJustification?: string;
  } | null>(null);
  const [justificationText, setJustificationText] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [shareLinkData, setShareLinkData] = useState<{ url: string; expiresAt: string } | null>(null);
  
  const generateParentToken = useGenerateParentToken();

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  }, [students, search]);

  const selectedStudent = useMemo(() => {
    return students?.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const handleJustifyAbsence = () => {
    if (!justificationModal || !justificationText.trim()) return;
    
    justifyAbsence.mutate({
      studentId: justificationModal.studentId,
      date: justificationModal.date,
      justification: justificationText.trim()
    }, {
      onSuccess: () => {
        setJustificationModal(null);
        setJustificationText("");
      }
    });
  };

  const openJustificationModal = (studentId: string, date: string, currentJustification?: string) => {
    setJustificationModal({ studentId, date, currentJustification });
    setJustificationText(currentJustification || "");
  };

  const handleGenerateShareLink = () => {
    if (!selectedStudentId) return;
    
    generateParentToken.mutate(selectedStudentId, {
      onSuccess: (data: any) => {
        setShareLinkData({
          url: data.url,
          expiresAt: data.expiresAt
        });
      }
    });
  };

  const copyToClipboard = () => {
    if (shareLinkData?.url) {
      navigator.clipboard.writeText(shareLinkData.url);
      // Feedback visual simples
      const button = event?.target as HTMLButtonElement;
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '✓ Copiado!';
        setTimeout(() => {
          button.innerHTML = originalText;
        }, 2000);
      }
    }
  };

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
    const seenCount = deliveries.filter(d => d.studentId === selectedStudentId && d.seen).length;
    const activityPercentage = totalActivities > 0 ? Math.round((deliveredCount / totalActivities) * 100) : 0;

    return {
      attendance: { total: totalDays, present: presentDays, absent: absentDays, percentage: attendancePercentage },
      activities: { total: totalActivities, delivered: deliveredCount, seen: seenCount, percentage: activityPercentage }
    };
  }, [selectedStudentId, attendance, activities, deliveries]);

  // Detailed attendance history for the selected student (only absences)
  const attendanceHistory = useMemo(() => {
    if (!selectedStudentId || !attendance) return [];
    
    const filtered = attendance
      .filter(a => a.studentId === selectedStudentId && !a.present) // Only absences
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return filtered;
  }, [selectedStudentId, attendance]);

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
              <div className="flex-1">
                <h1 className="text-3xl font-display font-extrabold text-foreground">{selectedStudent.name}</h1>
                <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
                  <UserIcon className="w-4 h-4" /> Aluno(a)
                </p>
              </div>
              <button
                onClick={handleGenerateShareLink}
                disabled={generateParentToken.isPending}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                {generateParentToken.isPending ? 'Gerando...' : 'Compartilhar'}
              </button>
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
                        <p className="text-xs font-bold text-accent uppercase tracking-wider">Vistos</p>
                        <p className="text-xl font-bold">{stats.activities.seen}</p>
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

            {/* Attendance Detailed History - Only Absences */}
            <div className="bg-card rounded-3xl p-6 shadow-sm border border-border/50">
              <h3 className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-destructive" /> Histórico de Faltas
              </h3>
              
              {!attendanceHistory?.length ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhuma falta registrada</p>
                  <p className="text-muted-foreground text-sm mt-1">Presença perfeita!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendanceHistory.map(record => (
                    <div key={record.id} className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-colors",
                      record.justified 
                        ? "bg-warning/10 border-warning/30" 
                        : "bg-destructive/5 border-destructive/20"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          record.justified ? "bg-warning text-white" : "bg-destructive text-white"
                        )}>
                          {record.justified ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">
                            {format(parseISO(record.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              record.justified 
                                ? "bg-warning/20 text-warning font-semibold" 
                                : "bg-destructive/20 text-destructive font-semibold"
                            )}>
                              {record.justified ? 'Falta Justificada' : 'Falta'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {record.justification && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground max-w-xs">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-warning" />
                          <span className="italic">{record.justification}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {record.justified ? (
                          <button
                            onClick={() => openJustificationModal(selectedStudentId!, record.date, record.justification || undefined)}
                            className="p-2 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                            title="Editar justificativa"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openJustificationModal(selectedStudentId!, record.date)}
                            className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium text-sm"
                            title="Adicionar justificativa"
                          >
                            Justificar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      <div key={activity.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/10 transition-colors cursor-pointer group"
                           onClick={() => setSelectedActivity(activity)}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              activity.type === 'homework' ? "bg-accent/30 text-accent-foreground" : "bg-primary/30 text-primary"
                            )}>
                              {activity.type === 'homework' ? 'Casa' : 'Sala'}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">
                              {format(new Date(activity.date), "dd/MM/yyyy")}
                            </span>
                            {delivery?.seen && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/30 text-accent-foreground flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                Visto
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">{activity.subject}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
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
                          <div className="p-2 text-muted-foreground group-hover:text-primary transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </div>
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

      {/* Share Link Modal */}
      {shareLinkData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                <Share2 className="w-6 h-6 text-primary" />
                Link Compartilhado
              </h2>
              <p className="text-muted-foreground mt-1">
                Compartilhe este link com os responsáveis
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Link de acesso</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLinkData.url}
                    readOnly
                    className="flex-1 px-4 py-3 bg-background border-2 border-border rounded-xl text-sm font-mono text-primary"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                    title="Copiar link"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-bold text-foreground mb-1">Validade do link</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(shareLinkData.expiresAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              
              <div className="bg-muted/20 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Importante:</strong> Este link dá acesso apenas aos dados deste aluno. 
                  Guarde-o em local seguro e compartilhe apenas com responsáveis autorizados.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-border/50 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShareLinkData(null)}
                className="px-6 py-3 rounded-xl font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-6 h-6 text-primary" />
                  Detalhes da Atividade
                </h2>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Activity Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-1">Disciplina</p>
                  <p className="font-bold text-foreground text-lg">{selectedActivity.subject}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-1">Tipo</p>
                  <span className={cn(
                    "px-3 py-1 rounded text-sm font-bold uppercase tracking-wider",
                    selectedActivity.type === 'homework' ? "bg-accent/30 text-accent-foreground" : "bg-primary/30 text-primary"
                  )}>
                    {selectedActivity.type === 'homework' ? 'Tarefa de Casa' : 'Atividade em Sala'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-1">Data</p>
                  <p className="font-bold text-foreground">
                    {format(new Date(selectedActivity.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-1">Status do Aluno</p>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const delivery = deliveries?.find(d => d.activityId === selectedActivity.id && d.studentId === selectedStudentId);
                      const isDelivered = delivery?.delivered;
                      return (
                        <span className={cn(
                          "px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-2",
                          isDelivered ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                        )}>
                          {isDelivered ? (
                            <><CheckCircle2 className="w-4 h-4" /> Entregue</>
                          ) : (
                            <><XCircle className="w-4 h-4" /> Pendente</>
                          )}
                        </span>
                      );
                    })()}
                    {(() => {
                      const delivery = deliveries?.find(d => d.activityId === selectedActivity.id && d.studentId === selectedStudentId);
                      return delivery?.seen && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/30 text-accent-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Visto
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedActivity.description && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-2">Descrição</p>
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/50">
                    <p className="text-foreground leading-relaxed">{selectedActivity.description}</p>
                  </div>
                </div>
              )}

              {/* Link */}
              {selectedActivity.link && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-2">Link da Atividade</p>
                  <a 
                    href={selectedActivity.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors group"
                  >
                    <LinkIcon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="flex-1 text-sm text-primary truncate">{selectedActivity.link}</span>
                    <ExternalLink className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>
              )}

              {/* Student Status Summary */}
              <div>
                <p className="text-sm font-bold text-muted-foreground mb-3">Status da Turma</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-success/20 rounded-xl border border-success/30">
                    <p className="text-2xl font-bold text-success">
                      {deliveries?.filter(d => d.activityId === selectedActivity.id && d.delivered).length || 0}
                    </p>
                    <p className="text-xs text-success font-semibold uppercase">Entregues</p>
                  </div>
                  <div className="text-center p-3 bg-accent/20 rounded-xl border border-accent/30">
                    <p className="text-2xl font-bold text-accent">
                      {deliveries?.filter(d => d.activityId === selectedActivity.id && d.seen).length || 0}
                    </p>
                    <p className="text-xs text-accent font-semibold uppercase">Vistos</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-xl border border-border/60">
                    <p className="text-2xl font-bold text-muted-foreground">
                      {students?.length || 0}
                    </p>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Total</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Justification Modal */}
      {justificationModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-warning" />
                {justificationModal.currentJustification ? 'Editar Justificativa' : 'Adicionar Justificativa'}
              </h2>
              <p className="text-muted-foreground mt-1">
                {format(parseISO(justificationModal.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-bold text-foreground mb-2">
                Motivo da falta
              </label>
              <textarea
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
                className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-foreground font-medium resize-none"
                rows={4}
                placeholder="Ex: O aluno estava doente, consulta médica, problemas familiares, etc."
              />
            </div>
            
            <div className="p-6 border-t border-border/50 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setJustificationModal(null);
                  setJustificationText("");
                }}
                className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors"
                disabled={justifyAbsence.isPending}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleJustifyAbsence}
                disabled={!justificationText.trim() || justifyAbsence.isPending}
                className="px-6 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {justifyAbsence.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
