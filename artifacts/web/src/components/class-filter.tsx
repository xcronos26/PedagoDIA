import React from "react";
import { useClasses } from "@/hooks/use-classes";
import { Users } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ClassFilterProps {
  value: string | null;
  onChange: (classId: string | null) => void;
  className?: string;
}

export function ClassFilter({ value, onChange, className }: ClassFilterProps) {
  const { data: classes, isLoading } = useClasses();

  if (isLoading || !classes?.length) return null;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground shrink-0">
        <Users className="w-4 h-4" />
        <span>Turma:</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onChange(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-semibold transition-all border",
            value === null
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-muted text-muted-foreground border-border/50 hover:bg-muted/80"
          )}
        >
          Todas
        </button>
        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => onChange(cls.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-semibold transition-all border",
              value === cls.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted text-muted-foreground border-border/50 hover:bg-muted/80"
            )}
          >
            {cls.name}
          </button>
        ))}
      </div>
    </div>
  );
}
