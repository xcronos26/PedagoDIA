import React, { useState } from "react";
import { Shield, Users, School, Cpu, TrendingUp, Search, MoreVertical, Lock, Unlock, ChevronDown, Plus, X, Check, Loader2, Copy, Eye, EyeOff } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminStats,
  useAdminTeachers,
  useAdminSchools,
  useBlockTeacher,
  useChangeTeacherRole,
  useChangeTeacherPlan,
  useCreateAdminSchool,
  useToggleSchoolStatus,
  type AdminTeacher,
  type AdminSchool,
} from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Plan Badge ─────────────────────────────────────────────────────────────────

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

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", PLAN_COLORS[plan] ?? "bg-gray-100 text-gray-600")}>
      {PLAN_LABELS[plan] ?? plan}
    </span>
  );
}

// ── Role Badge ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  professor: "bg-green-100 text-green-700",
  admin_institucional: "bg-indigo-100 text-indigo-700",
  super_admin: "bg-red-100 text-red-700",
};
const ROLE_LABELS: Record<string, string> = {
  professor: "Professor",
  admin_institucional: "Diretor",
  super_admin: "Super Admin",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600")}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | undefined; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value ?? "—"}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ── Teacher Row ───────────────────────────────────────────────────────────────

function TeacherRow({ teacher, currentUserId }: { teacher: AdminTeacher; currentUserId: string }) {
  const { toast } = useToast();
  const { mutate: block, isPending: blocking } = useBlockTeacher();
  const { mutate: changeRole, isPending: changingRole } = useChangeTeacherRole();
  const { mutate: changePlan, isPending: changingPlan } = useChangeTeacherPlan();
  const [showActions, setShowActions] = useState(false);

  const isMe = teacher.id === currentUserId;

  const handleBlock = () => {
    block(
      { id: teacher.id, blocked: !teacher.isBlocked },
      {
        onSuccess: () => toast({ title: teacher.isBlocked ? "Conta desbloqueada" : "Conta bloqueada" }),
        onError: (e) => toast({ title: e.message, variant: "destructive" }),
      }
    );
    setShowActions(false);
  };

  return (
    <tr className={cn("border-b border-border/30 hover:bg-muted/30 transition-colors", teacher.isBlocked && "opacity-60")}>
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-foreground">{teacher.name}</div>
        <div className="text-xs text-muted-foreground">{teacher.email}</div>
      </td>
      <td className="px-4 py-3"><RoleBadge role={teacher.role} /></td>
      <td className="px-4 py-3"><PlanBadge plan={teacher.planType} /></td>
      <td className="px-4 py-3">
        <span className={cn("text-xs font-medium", teacher.vinculo === "escola" ? "text-indigo-600" : "text-gray-500")}>
          {teacher.vinculo === "escola" ? "Escola" : "Individual"}
        </span>
      </td>
      <td className="px-4 py-3">
        {teacher.isBlocked
          ? <span className="text-xs font-semibold text-red-600">Bloqueado</span>
          : <span className="text-xs font-semibold text-green-600">Ativo</span>
        }
      </td>
      <td className="px-4 py-3">
        <div className="text-xs text-muted-foreground">
          {new Date(teacher.createdAt).toLocaleDateString("pt-BR")}
        </div>
      </td>
      <td className="px-4 py-3">
        {!isMe && (
          <div className="relative">
            <button
              onClick={() => setShowActions((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-8 z-20 bg-background border border-border rounded-xl shadow-lg py-1 w-52">
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plano</div>
                  {(["free", "basic", "medium", "advanced"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => { changePlan({ id: teacher.id, planType: p }, { onSuccess: () => { toast({ title: `Plano alterado para ${PLAN_LABELS[p]}` }); setShowActions(false); } }); }}
                      disabled={changingPlan || teacher.planType === p}
                      className={cn("w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors", teacher.planType === p && "font-bold text-primary")}
                    >
                      {PLAN_LABELS[p]} {teacher.planType === p && "✓"}
                    </button>
                  ))}
                  <div className="border-t border-border/50 my-1" />
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Perfil</div>
                  {(["professor", "admin_institucional"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => { changeRole({ id: teacher.id, role: r }, { onSuccess: () => { toast({ title: `Perfil alterado para ${ROLE_LABELS[r]}` }); setShowActions(false); } }); }}
                      disabled={changingRole || teacher.role === r}
                      className={cn("w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors", teacher.role === r && "font-bold text-primary")}
                    >
                      {ROLE_LABELS[r]} {teacher.role === r && "✓"}
                    </button>
                  ))}
                  <div className="border-t border-border/50 my-1" />
                  <button
                    onClick={handleBlock}
                    disabled={blocking}
                    className={cn("w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-muted transition-colors", teacher.isBlocked ? "text-green-600" : "text-red-600")}
                  >
                    {teacher.isBlocked ? <><Unlock className="w-4 h-4" />Desbloquear</> : <><Lock className="w-4 h-4" />Bloquear</>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── School Row ────────────────────────────────────────────────────────────────

function SchoolRow({ school }: { school: AdminSchool }) {
  const { toast } = useToast();
  const { mutate: toggle, isPending } = useToggleSchoolStatus();
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(school.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <tr className="border-b border-border/30 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-foreground">{school.name}</div>
        <div className="text-xs text-muted-foreground">{new Date(school.createdAt).toLocaleDateString("pt-BR")}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">{showCode ? school.inviteCode : "••••••"}</span>
          <button onClick={() => setShowCode((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
            {showCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-foreground">{school.totalMembros}</span>
      </td>
      <td className="px-4 py-3">
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", school.status === "ativa" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
          {school.status === "ativa" ? "Ativa" : "Inativa"}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => toggle({ id: school.id, status: school.status === "ativa" ? "inativa" : "ativa" }, { onSuccess: () => toast({ title: school.status === "ativa" ? "Escola desativada" : "Escola ativada" }) })}
          disabled={isPending}
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all",
            school.status === "ativa"
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-green-200 text-green-600 hover:bg-green-50"
          )}
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : school.status === "ativa" ? "Desativar" : "Ativar"}
        </button>
      </td>
    </tr>
  );
}

// ── Create School Modal ────────────────────────────────────────────────────────

function CreateSchoolModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const { toast } = useToast();
  const { mutate: create, isPending } = useCreateAdminSchool();

  const handleCreate = () => {
    if (!name.trim()) return;
    create(name.trim(), {
      onSuccess: () => {
        toast({ title: "Escola criada com sucesso!" });
        onClose();
      },
      onError: (e) => toast({ title: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">Nova Escola</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <label className="text-sm font-semibold text-foreground block mb-1.5">Nome da escola</label>
        <input
          className="w-full border border-border/60 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background mb-5"
          placeholder="Ex: EMEF João Paulo II"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Cancelar</button>
          <button
            onClick={handleCreate}
            disabled={isPending || !name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Criar escola"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "visao-geral" | "professores" | "escolas";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("visao-geral");
  const [search, setSearch] = useState("");
  const [showCreateSchool, setShowCreateSchool] = useState(false);

  const { data: stats, isLoading: loadingStats } = useAdminStats();
  const { data: teachers = [], isLoading: loadingTeachers } = useAdminTeachers();
  const { data: schools = [], isLoading: loadingSchools } = useAdminSchools();

  const filtered = teachers.filter((t) =>
    search === "" ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-red-100 p-3 rounded-2xl text-red-600">
          <Shield className="w-7 h-7" />
        </div>
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground">Painel Super Admin</h1>
          <p className="text-muted-foreground">Gestão global da plataforma PedagoDIA</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-8 w-fit">
        {([
          { id: "visao-geral" as Tab, label: "Visão Geral" },
          { id: "professores" as Tab, label: "Professores" },
          { id: "escolas" as Tab, label: "Escolas" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Visão Geral ── */}
      {tab === "visao-geral" && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Professores" value={stats?.totalProfessores} icon={Users} color="bg-blue-100 text-blue-600" />
                <StatCard label="Escolas" value={stats?.totalEscolas} icon={School} color="bg-indigo-100 text-indigo-600" />
                <StatCard label="Atividades geradas" value={stats?.totalAtividades} icon={TrendingUp} color="bg-green-100 text-green-600" />
                <StatCard label="Gerações com IA" value={stats?.totalGeneracoesIA} icon={Cpu} color="bg-purple-100 text-purple-600" />
                <StatCard label="Diretores" value={stats?.totalDiretores} icon={Shield} color="bg-amber-100 text-amber-600" />
                <StatCard label="Contas bloqueadas" value={stats?.totalBloqueados} icon={Lock} color="bg-red-100 text-red-600" />
              </div>

              <div className="bg-card border border-border/50 rounded-2xl p-5">
                <h3 className="font-display font-bold text-lg mb-4">Resumo rápido</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="text-muted-foreground mb-1">Professores ativos</div>
                    <div className="font-bold text-2xl text-foreground">{(stats?.totalProfessores ?? 0) - (stats?.totalBloqueados ?? 0)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stats?.totalBloqueados ?? 0} bloqueados</div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="text-muted-foreground mb-1">Escolas ativas</div>
                    <div className="font-bold text-2xl text-foreground">{schools.filter(s => s.status === "ativa").length}</div>
                    <div className="text-xs text-muted-foreground mt-1">{schools.filter(s => s.status === "inativa").length} inativas</div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="text-muted-foreground mb-1">Média atividades/prof.</div>
                    <div className="font-bold text-2xl text-foreground">
                      {stats?.totalProfessores ? Math.round((stats.totalAtividades / stats.totalProfessores) * 10) / 10 : 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">por professor</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Professores ── */}
      {tab === "professores" && (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border/50 flex items-center justify-between gap-4">
            <h3 className="font-display font-bold text-lg">Professores ({teachers.length})</h3>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-border/60 rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {loadingTeachers ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left">
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Usuário</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Perfil</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Plano</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Vínculo</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Criado em</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((teacher) => (
                    <TeacherRow key={teacher.id} teacher={teacher} currentUserId={user?.id ?? ""} />
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  {search ? "Nenhum professor encontrado para essa busca." : "Nenhum professor cadastrado."}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Escolas ── */}
      {tab === "escolas" && (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg">Escolas ({schools.length})</h3>
            <button
              onClick={() => setShowCreateSchool(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova escola
            </button>
          </div>
          {loadingSchools ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left">
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Escola</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Código de convite</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Membros</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <SchoolRow key={school.id} school={school} />
                  ))}
                </tbody>
              </table>
              {schools.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Nenhuma escola cadastrada ainda.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCreateSchool && <CreateSchoolModal onClose={() => setShowCreateSchool(false)} />}
    </div>
  );
}
