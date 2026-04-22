import React from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useClasses } from "@/hooks/use-classes";
import { GraduationCap, CheckSquare, CalendarDays, BookOpen, BarChart3, Users, ArrowRight, Sparkles } from "lucide-react";

const features = [
  { icon: CheckSquare, label: "Chamada Digital", desc: "Registre presenças com um clique" },
  { icon: CalendarDays, label: "Diário", desc: "Visão semanal da turma" },
  { icon: BookOpen, label: "Atividades", desc: "Controle de entregas por aluno" },
  { icon: BarChart3, label: "Relatórios", desc: "Compartilhe com os pais" },
  { icon: Users, label: "Turmas", desc: "Organize múltiplas turmas" },
];

export default function BemVinda() {
  const { user } = useAuth();
  const { data: classes } = useClasses();
  const firstName = user?.name?.split(" ")[0] ?? "Professora";
  const ctaHref = classes && classes.length > 0 ? "/" : "/turmas";
  const ctaLabel = classes && classes.length > 0 ? "Ir para o início" : "Vamos começar";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-10%] w-[45%] h-[45%] bg-primary/15 rounded-full blur-3xl" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[45%] h-[45%] bg-accent/15 rounded-full blur-3xl" />

      <div className="w-full max-w-2xl bg-card border border-border/50 rounded-3xl shadow-2xl p-8 md:p-12 animate-slide-up relative z-10">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="bg-primary/10 p-5 rounded-3xl text-primary">
              <GraduationCap className="w-14 h-14" />
            </div>
            <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full p-1">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-extrabold text-foreground mb-3">
            Bem-vinda, {firstName}! 🎉
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Seu <span className="font-bold text-primary">PedagoDIA</span> está pronto. Aqui você tem tudo
            que precisa para organizar sua sala de aula de forma simples e eficiente.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="bg-background border border-border/50 rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <p className="font-bold text-sm text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href={ctaHref}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl transition-all"
          >
            {ctaLabel}
            <ArrowRight className="w-5 h-5" />
          </Link>
          {ctaHref !== "/" && (
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ir para o início
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
