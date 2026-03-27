import React, { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { GraduationCap, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await apiFetch<{ token: string; teacher: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(res.token, res.teacher);
      window.location.href = import.meta.env.BASE_URL + 'chamada';
    } catch (err: any) {
      toast({
        title: "Erro ao entrar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-3xl" />

      <div className="w-full max-w-4xl flex bg-card rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative z-10 border border-border/50">
        {/* Form Section */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-10 text-center md:text-left">
            <div className="inline-flex bg-primary/10 p-3 rounded-2xl text-primary mb-4">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-display font-extrabold text-foreground mb-2">Bem-vinda(o) de volta!</h1>
            <p className="text-muted-foreground text-lg">Acesse sua caderneta digital PedagoDIA.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground ml-1">E-mail</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-background border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-foreground font-medium"
                  placeholder="professora@escola.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground ml-1">Senha</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-background border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-foreground font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-lg shadow-primary/25 hover:-translate-y-1 hover:shadow-xl transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Entrar"}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="mt-8 text-center text-muted-foreground font-medium">
            Não tem uma conta?{" "}
            <Link href="/register" className="text-primary hover:underline font-bold">
              Cadastre-se grátis
            </Link>
          </div>
        </div>

        {/* Image Section */}
        <div className="hidden md:block w-1/2 relative bg-primary/5">
          <img 
            src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
            alt="Educação e aprendizado" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      </div>
    </div>
  );
}
