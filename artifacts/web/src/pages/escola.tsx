import React, { useState } from "react";
import { School, Users, BookOpen, Cpu, Copy, Check, Eye, EyeOff, Loader2, AlertCircle, Plus } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useToast } from "@/hooks/use-toast";
import { useEscolaDashboard, useJoinSchool, useCreateSchool, useMySchools } from "@/hooks/use-escola";
import { useAuth } from "@/hooks/use-auth";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  basic: "bg-blue-100 text-blue-700",
  medium: "bg-purple-100 text-purple-700",
  advanced: "bg-amber-100 text-amber-700",
};
const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Básico",
  medium: "Médio",
  advanced: "Avançado",
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ── Join School Section ───────────────────────────────────────────────────────

function JoinSchoolSection() {
  const [code, setCode] = useState("");
  const { toast } = useToast();
  const { mutate: join, isPending } = useJoinSchool();

  const handleJoin = () => {
    if (!code.trim()) return;
    join(code.trim(), {
      onSuccess: () => {
        toast({ title: "Vinculado com sucesso!", description: "Você agora faz parte da escola." });
        setCode("");
        window.location.reload();
      },
      onError: (e) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
        <School className="w-10 h-10 text-indigo-600" />
      </div>
      <div>
        <h2 className="font-display font-bold text-2xl text-foreground">Entrar em uma escola</h2>
        <p className="text-muted-foreground mt-2">Insira o código de convite fornecido pela sua escola para se vincular.</p>
      </div>
      <div className="w-full flex gap-2">
        <input
          className="flex-1 border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-background uppercase tracking-widest font-mono text-center"
          placeholder="CÓDIGO"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <button
          onClick={handleJoin}
          disabled={isPending || !code.trim()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
        </button>
      </div>
    </div>
  );
}

// ── Dashboard for Directors ────────────────────────────────────────────────────

export default function EscolaDashboard() {
  const { user } = useAuth();
  const isDirector = user?.role === "admin_institucional" || user?.role === "super_admin";
  const { data: dashboard, isLoading, error } = useEscolaDashboard();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showCreateSchool, setShowCreateSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const { mutate: createSchool, isPending: creatingSchool } = useCreateSchool();

  const copyCode = () => {
    if (!dashboard) return;
    navigator.clipboard.writeText(dashboard.escola.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateSchool = () => {
    if (!newSchoolName.trim()) return;
    createSchool(newSchoolName.trim(), {
      onSuccess: () => {
        toast({ title: "Escola criada com sucesso!" });
        setShowCreateSchool(false);
        setNewSchoolName("");
        window.location.reload();
      },
      onError: (e) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
            <School className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl text-foreground">Minha Escola</h1>
            <p className="text-muted-foreground">Gestão de professores e uso da plataforma</p>
          </div>
        </div>

        {isDirector ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Você ainda não está vinculado a nenhuma escola. Crie uma escola ou use um código de convite.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateSchool(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                Criar minha escola
              </button>
            </div>
            {showCreateSchool && (
              <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
                <h3 className="font-semibold text-foreground">Nome da escola</h3>
                <input
                  className="w-full border border-border/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-background"
                  placeholder="Ex: EMEF João Paulo II"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreateSchool()}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowCreateSchool(false)} className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">Cancelar</button>
                  <button
                    onClick={handleCreateSchool}
                    disabled={creatingSchool || !newSchoolName.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {creatingSchool ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <JoinSchoolSection />
        )}
      </div>
    );
  }

  const { escola, stats, professores } = dashboard;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
            <School className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-3xl text-foreground">{escola.name}</h1>
              <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", escola.status === "ativa" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                {escola.status === "ativa" ? "Ativa" : "Inativa"}
              </span>
            </div>
            <p className="text-muted-foreground">Painel da Diretoria</p>
          </div>
        </div>

        {/* Invite code */}
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
          <div>
            <div className="text-xs font-semibold text-indigo-600 mb-0.5">Código de convite</div>
            <div className="font-mono font-bold text-indigo-700 tracking-widest text-lg">
              {showCode ? escola.inviteCode : "••••••"}
            </div>
          </div>
          <div className="flex flex-col gap-1 ml-2">
            <button onClick={() => setShowCode((v) => !v)} className="text-indigo-400 hover:text-indigo-700 transition-colors">
              {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={copyCode} className="text-indigo-400 hover:text-indigo-700 transition-colors">
              {copiedCode ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Professores" value={stats.totalProfessores} icon={Users} color="bg-indigo-100 text-indigo-600" />
        <StatCard label="Atividades geradas" value={stats.totalAtividades} icon={BookOpen} color="bg-green-100 text-green-600" />
        <StatCard label="Gerações com IA" value={stats.totalGeneracoesIA} icon={Cpu} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Teachers table */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm mb-8">
        <div className="p-5 border-b border-border/50">
          <h3 className="font-display font-bold text-lg">Professores da escola</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Compartilhe o código de convite para novos professores entrarem.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 text-left">
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Professor(a)</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Perfil na escola</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Plano</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Entrou em</th>
              </tr>
            </thead>
            <tbody>
              {professores.map((p) => (
                <tr key={p.memberId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{p.teacherName}</div>
                    <div className="text-xs text-muted-foreground">{p.teacherEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", p.memberRole === "admin_institucional" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600")}>
                      {p.memberRole === "admin_institucional" ? "Diretor(a)" : "Professor(a)"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", PLAN_COLORS[p.planType] ?? "bg-gray-100 text-gray-600")}>
                      {PLAN_LABELS[p.planType] ?? p.planType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium", p.isBlocked ? "text-red-600" : "text-green-600")}>
                      {p.isBlocked ? "Bloqueado" : "Ativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.joinedAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {professores.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhum professor vinculado ainda. Compartilhe o código de convite!
            </div>
          )}
        </div>
      </div>

      {/* Invite section */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
        <h3 className="font-display font-bold text-indigo-900 mb-2">Convidar professores</h3>
        <p className="text-sm text-indigo-700 mb-4">
          Compartilhe o código <strong>{showCode ? escola.inviteCode : "••••••"}</strong> com os professores da sua escola.
          Eles devem acessar <strong>Perfil → Minha Escola</strong> e inserir o código de convite.
        </p>
        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all"
        >
          {copiedCode ? <><Check className="w-4 h-4" />Copiado!</> : <><Copy className="w-4 h-4" />Copiar código</>}
        </button>
      </div>
    </div>
  );
}
