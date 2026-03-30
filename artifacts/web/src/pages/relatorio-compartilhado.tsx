import React from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParentReport } from "@/hooks/use-parent-report";
import { BarChart3, TrendingUp, CheckCircle2, XCircle, User as UserIcon, BookOpen, Calendar, AlertCircle, Eye, FileText, Link as LinkIcon, ExternalLink, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function RelatorioCompartilhado() {
  const token = window.location.pathname.split('/').pop() || '';
  const { data: report, isLoading, error } = useParentReport(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/5 to-muted/5 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Relatório não encontrado</h1>
          <p className="text-muted-foreground">
            {error?.message || "O link pode ter expirado ou ser inválido. Entre em contato com a escola."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-border/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-display font-bold text-xl">
                {report.student.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">{report.student.name}</h1>
                <p className="text-muted-foreground text-sm">Relatório de Desempenho Escolar</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Gerado em</p>
              <p className="text-sm font-medium">{format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attendance Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-border/20">
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Frequência Escolar
            </h3>
            <div className="flex items-center gap-8">
              <div className="w-32 h-32 relative shrink-0">
                {report.stats.attendance.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Presenças', value: report.stats.attendance.present },
                          { name: 'Faltas', value: report.stats.attendance.absent }
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
                  <span className="text-xl font-display font-bold text-foreground">{report.stats.attendance.percentage}%</span>
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Total de Aulas</p>
                  <p className="text-2xl font-bold text-foreground">{report.stats.attendance.total}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs font-bold text-success uppercase tracking-wider">Presenças</p>
                    <p className="text-xl font-bold">{report.stats.attendance.present}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-destructive uppercase tracking-wider">Faltas</p>
                    <p className="text-xl font-bold">{report.stats.attendance.absent}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activities Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-border/20">
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" /> Entrega de Atividades
            </h3>
            <div className="flex items-center gap-8">
              <div className="w-32 h-32 relative shrink-0">
                {report.stats.activities.total > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Entregues', value: report.stats.activities.delivered },
                          { name: 'Pendentes', value: report.stats.activities.total - report.stats.activities.delivered }
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
                  <span className="text-xl font-display font-bold text-foreground">{report.stats.activities.percentage}%</span>
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Total Atribuído</p>
                  <p className="text-2xl font-bold text-foreground">{report.stats.activities.total}</p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">Entregues</p>
                    <p className="text-xl font-bold">{report.stats.activities.delivered}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-accent uppercase tracking-wider">Vistos</p>
                    <p className="text-xl font-bold">{report.stats.activities.seen}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pendentes</p>
                    <p className="text-xl font-bold">{report.stats.activities.total - report.stats.activities.delivered}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-border/20">
          <h3 className="text-xl font-display font-bold text-foreground mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-destructive" /> Histórico de Faltas
          </h3>
          
          {!report.attendance?.length ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhuma falta registrada</p>
              <p className="text-muted-foreground text-sm mt-1">Presença perfeita!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {report.attendance.filter(a => !a.present).map(record => (
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
                            ? "bg-warning/30 text-warning font-semibold" 
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activities List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-border/20">
          <h3 className="text-xl font-display font-bold text-foreground mb-6">Histórico de Atividades</h3>
          
          {!report.activities?.length ? (
            <p className="text-muted-foreground p-4 text-center bg-muted/20 rounded-xl">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-3">
              {report.activities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50">
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
                      {activity.seen && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent/30 text-accent-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Visto
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-foreground">{activity.subject}</p>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm",
                      activity.delivered ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                    )}>
                      {activity.delivered ? (
                        <><CheckCircle2 className="w-5 h-5" /> Entregue</>
                      ) : (
                        <><XCircle className="w-5 h-5" /> Pendente</>
                      )}
                    </div>
                    {activity.link && (
                      <a 
                        href={activity.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary hover:text-white transition-colors"
                        title="Acessar Link"
                      >
                        <LinkIcon className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-border/20 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Relatório gerado automaticamente • Para dúvidas, entre em contato com a escola
          </p>
        </div>
      </div>
    </div>
  );
}
