import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { CalendarDays, CheckSquare, BookOpen, BarChart3, LogOut, GraduationCap, Menu, Plus } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>;
  }

  if (!user) {
    return <>{children}</>; // Unauthenticated pages (Login/Register) handle themselves
  }

  const navItems = [
    { name: "Chamada", href: "/chamada", icon: CheckSquare },
    { name: "Diário", href: "/diario", icon: CalendarDays },
    { name: "Atividades", href: "/atividades", icon: BookOpen },
    { name: "Relatórios", href: "/relatorios", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-sidebar border-r border-sidebar-border shadow-sm z-10 sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3 text-primary font-display font-bold text-2xl tracking-tight">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <GraduationCap className="w-7 h-7" />
            </div>
            PedagoDIA
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 translate-x-1" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "" : "opacity-70 group-hover:opacity-100")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border mt-auto bg-muted/20">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-display text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 h-screen overflow-y-auto">
        {/* Mobile Header */}
        <header className="md:hidden bg-sidebar border-b border-border p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2 text-primary font-display font-bold text-xl">
            <GraduationCap className="w-6 h-6" />
            PedagoDIA
          </div>
          <button onClick={logout} className="text-muted-foreground p-2 rounded-lg hover:bg-muted">
            <LogOut className="w-5 h-5" />
          </button>
        </header>
        
        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border flex justify-around p-2 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-30">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[70px] transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:bg-sidebar-accent"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full transition-all duration-200",
                isActive ? "bg-primary/10" : ""
              )}>
                <item.icon className={cn("w-6 h-6", isActive ? "fill-primary/20" : "")} />
              </div>
              <span className="text-[10px] font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
