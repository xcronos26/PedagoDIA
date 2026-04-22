import React, { useState } from "react";
import { Link } from "wouter";
import { useClasses, useCreateClass, useUpdateClass, useDeleteClass } from "@/hooks/use-classes";
import { Users, Plus, Edit2, Trash2, Loader2, GraduationCap, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ModalMode = { type: "create" } | { type: "edit"; id: string; currentName: string };

export default function Turmas() {
  const { data: classes, isLoading } = useClasses();
  const { mutate: createClass, isPending: creating } = useCreateClass();
  const { mutate: updateClass, isPending: updating } = useUpdateClass();
  const { mutate: deleteClass } = useDeleteClass();
  const { toast } = useToast();

  const [modal, setModal] = useState<ModalMode | null>(null);
  const [modalName, setModalName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setModalName("");
    setModal({ type: "create" });
  };

  const openEdit = (id: string, name: string) => {
    setModalName(name);
    setModal({ type: "edit", id, currentName: name });
  };

  const closeModal = () => {
    setModal(null);
    setModalName("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) return;

    if (modal?.type === "create") {
      createClass({ name: modalName.trim() }, {
        onSuccess: () => {
          closeModal();
          toast({ title: "Turma criada com sucesso!" });
        },
        onError: (err) => toast({ title: "Erro ao criar turma", description: err.message, variant: "destructive" }),
      });
    } else if (modal?.type === "edit") {
      updateClass({ id: modal.id, name: modalName.trim() }, {
        onSuccess: () => {
          closeModal();
          toast({ title: "Turma renomeada." });
        },
        onError: (err) => toast({ title: "Erro ao renomear turma", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteClass(id, {
      onSuccess: () => {
        setDeletingId(null);
        toast({ title: "Turma excluída. Alunos mantidos." });
      },
      onError: (err) => {
        setDeletingId(null);
        toast({ title: "Erro ao excluir turma", description: err.message, variant: "destructive" });
      },
    });
  };

  const isPending = creating || updating;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-foreground">Turmas</h1>
          <p className="text-muted-foreground mt-1">Organize seus alunos em turmas separadas.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5" />
          Nova Turma
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Carregando turmas...</p>
        </div>
      ) : !classes?.length ? (
        <div className="bg-card border border-border/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="bg-primary/10 p-5 rounded-3xl mb-4">
            <GraduationCap className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Nenhuma turma criada</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            Crie sua primeira turma para começar a organizar seus alunos. Depois, você poderá filtrar chamadas, relatórios e atividades por turma.
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-5 h-5" />
            Criar primeira turma
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <div
              key={cls.id}
              className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(cls.id, cls.name)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Renomear turma"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {deletingId === cls.id ? (
                    <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/20 rounded-lg px-2 py-1">
                      <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-xs font-bold text-destructive">Excluir?</span>
                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="text-xs font-bold text-destructive hover:underline ml-1"
                      >
                        Sim
                      </button>
                      <span className="text-destructive/50">·</span>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs font-bold text-muted-foreground hover:underline"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(cls.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Excluir turma"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-display font-bold text-foreground leading-tight">{cls.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {cls.studentCount === 0
                    ? "Nenhum aluno ainda"
                    : `${cls.studentCount} aluno${cls.studentCount !== 1 ? "s" : ""}`}
                </p>
              </div>

              <Link
                href="/chamada"
                className="text-xs font-bold text-primary hover:underline mt-auto"
              >
                Ir para Chamada →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-2xl font-display font-bold text-foreground">
                {modal.type === "create" ? "Nova Turma" : "Renomear Turma"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Nome da Turma</label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={modalName}
                  onChange={e => setModalName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-foreground font-medium"
                  placeholder="Ex: 3º Ano A, Tarde, Matemática..."
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !modalName.trim()}
                  className="px-5 py-3 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2"
                >
                  {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {modal.type === "create" ? "Criar Turma" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
