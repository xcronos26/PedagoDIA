import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { User, Mail, Save, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Perfil() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const hasChanges = name.trim() !== "" && name.trim() !== user?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !hasChanges) return;
    setIsSaving(true);
    try {
      await updateProfile(name.trim());
      setSaved(true);
      toast({ title: "Perfil atualizado com sucesso!" });
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      toast({
        title: "Erro ao salvar perfil",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-display font-extrabold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações de conta.</p>
      </div>

      {/* Avatar */}
      <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display font-bold text-4xl shrink-0">
          {(user?.name ?? "P").charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xl font-display font-bold text-foreground">{user?.name}</p>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Edit Name */}
      <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm space-y-6">
        <h2 className="text-lg font-display font-bold text-foreground">Editar Informações</h2>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Nome
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-foreground font-medium transition-all"
            placeholder="Seu nome completo"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
            <Mail className="w-4 h-4" />
            E-mail
            <span className="text-xs font-normal">(não editável)</span>
          </label>
          <input
            type="email"
            value={user?.email ?? ""}
            disabled
            className="w-full px-4 py-3 bg-muted/50 border-2 border-border/50 rounded-xl text-muted-foreground font-medium cursor-not-allowed"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
              saved
                ? "bg-success text-success-foreground"
                : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5",
              (isSaving || !hasChanges) && "opacity-50 cursor-not-allowed hover:translate-y-0"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : saved ? (
              <Check className="w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saved ? "Salvo!" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
