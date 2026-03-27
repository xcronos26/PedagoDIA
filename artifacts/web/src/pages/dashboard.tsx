import React, { useMemo } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStudents } from "@/hooks/use-students";
import { useActivities } from "@/hooks/use-activities";
import { useAttendanceByDate } from "@/hooks/use-attendance";
import { useAuth } from "@/hooks/use-auth";
import { CheckSquare, CalendarDays, BookOpen, BarChart3, Users, TrendingUp, ClipboardList, ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDisplay = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const { data: students } = useStudents();
  const { data: activities } = useActivities();
  const { data: todayAttendance } = useAttendanceByDate(today);

  const attendanceStats = useMemo(() => {
    if (!todayAttendance || !students) return null;
    const taken = todayAttendance.length > 0;
    const present = todayAttendance.filter(a => a.present).length;
    const absent = todayAttendance.filter(a => !a.present).length;
    const total = students.length;
    return { taken, present, absent, total };
  }, [todayAttendance, students]);

  const recentActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [activities]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const quickLinks = [
    { name: "Chamada", desc: "Registrar presença hoje", href: "/chamada", icon: CheckSquare, color: "bg-primary/10 text-primary" },
    { name: "Diário", desc: "Escrever no diário", href: "/diario", icon: CalendarDays, color: "bg-accent/20 text-accent-foreground" },
    { name: "Atividades", desc: "Gerenciar atividades", href: "/atividades", icon: BookOpen, color: "bg-success/10 text-success" },
    { name: "Relatórios", desc: "Ver desempenho dos alunos", href: "/relatorios", icon: BarChart3, color: "bg-blue-500/10 text-blue-600" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-slide-up">
      {/* Welcome Header */}
      <div>
        <p className="text-muted-foreground font-medium capitalize">{todayDisplay}</p>
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mt-1">
          {greeting}, {user?.name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">Aqui está o resumo da sua turma hoje.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{students?.length ?? "—"}</p>
          <p className="text-sm font-semibold text-muted-foreground mt-1">Alunos</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-success/10 p-2 rounded-xl text-success">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">
            {attendanceStats?.taken ? attendanceStats.present : "—"}
          </p>
          <p className="text-sm font-semibold text-muted-foreground mt-1">
            {attendanceStats?.taken ? "Presentes hoje" : "Chamada pendente"}
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-destructive/10 p-2 rounded-xl text-destructive">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">
            {attendanceStats?.taken ? attendanceStats.absent : "—"}
          </p>
          <p className="text-sm font-semibold text-muted-foreground mt-1">
            {attendanceStats?.taken ? "Faltas hoje" : "Chamada pendente"}
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-accent/20 p-2 rounded-xl text-accent-foreground">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{activities?.length ?? "—"}</p>
          <p className="text-sm font-semibold text-muted-foreground mt-1">Atividades</p>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-display font-bold text-foreground mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((item) => (
            <Link key={item.name} href={item.href}>
              <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
                <div className={cn("p-3 rounded-xl w-fit mb-4", item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <p className="font-display font-bold text-foreground group-hover:text-primary transition-colors">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      {recentActivities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-foreground">Atividades Recentes</h2>
            <Link href="/atividades" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
            {recentActivities.map((act, i) => (
              <div
                key={act.id}
                className={cn(
                  "flex items-center gap-4 p-4",
                  i < recentActivities.length - 1 ? "border-b border-border/30" : ""
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl",
                  act.type === "homework" ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary"
                )}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{act.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {act.type === "homework" ? "Para Casa" : "Em Sala"} •{" "}
                    {format(new Date(act.date), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for new teachers */}
      {!students?.length && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
          <p className="font-display font-bold text-foreground text-lg mb-2">Bem-vinda(o) ao PedagoDIA!</p>
          <p className="text-muted-foreground mb-4">Comece adicionando seus alunos na tela de Chamada.</p>
          <Link href="/chamada">
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all">
              Ir para Chamada
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
