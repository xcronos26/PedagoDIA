import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export type DayEntry = {
  subject: string;
  turma?: string;
};

export type WeeklySchedule = {
  segunda: DayEntry[];
  terca: DayEntry[];
  quarta: DayEntry[];
  quinta: DayEntry[];
  sexta: DayEntry[];
};

export type TeacherRole = "professor" | "admin_institucional" | "super_admin";
export type TeacherVinculo = "individual" | "escola";

export interface Teacher {
  id: string;
  name: string;
  email: string;
  weeklySchedule?: WeeklySchedule | null;
  grade?: string | null;
  teacherType?: "regente" | "disciplina" | null;
  role?: TeacherRole;
  vinculo?: TeacherVinculo;
}

interface AuthContextType {
  user: Teacher | null;
  isLoading: boolean;
  login: (token: string, teacher: Teacher) => void;
  logout: () => void;
  updateProfile: (name: string, weeklySchedule?: WeeklySchedule | null, grade?: string | null, teacherType?: "regente" | "disciplina" | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('pedagogia_token');
      if (token) {
        try {
          const res = await apiFetch<{ teacher: Teacher }>('/auth/me');
          setUser(res.teacher);
        } catch (err) {
          console.error("Auth init failed", err);
          localStorage.removeItem('pedagogia_token');
          localStorage.removeItem('pedagogia_teacher');
        }
      }
      setIsLoading(false);
    }
    initAuth();
  }, []);

  const login = (token: string, teacher: Teacher) => {
    localStorage.setItem('pedagogia_token', token);
    localStorage.setItem('pedagogia_teacher', JSON.stringify(teacher));
    setUser(teacher);
  };

  const logout = () => {
    localStorage.removeItem('pedagogia_token');
    localStorage.removeItem('pedagogia_teacher');
    setUser(null);
    window.location.href = import.meta.env.BASE_URL + 'login';
  };

  const updateProfile = async (name: string, weeklySchedule?: WeeklySchedule | null, grade?: string | null, teacherType?: "regente" | "disciplina" | null): Promise<void> => {
    const body: Record<string, unknown> = { name };
    if (weeklySchedule !== undefined) {
      body.weeklySchedule = weeklySchedule;
    }
    if (grade !== undefined) {
      body.grade = grade;
    }
    if (teacherType !== undefined) {
      body.teacherType = teacherType;
    }
    const res = await apiFetch<{ teacher: Teacher }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setUser(res.teacher);
    localStorage.setItem('pedagogia_teacher', JSON.stringify(res.teacher));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
