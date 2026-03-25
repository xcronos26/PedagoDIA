import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '@/utils/api';

const TOKEN_KEY = '@pedagogia:token';
const TEACHER_KEY = '@pedagogia:teacher';

export type Teacher = {
  id: string;
  name: string;
  email: string;
};

interface AuthContextValue {
  token: string | null;
  teacher: Teacher | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const [savedToken, savedTeacher] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(TEACHER_KEY),
        ]);
        if (savedToken && savedTeacher) {
          try {
            const me = await apiFetch<{ teacher: Teacher }>('/auth/me', { token: savedToken });
            setToken(savedToken);
            setTeacher(me.teacher);
          } catch {
            await AsyncStorage.multiRemove([TOKEN_KEY, TEACHER_KEY]);
          }
        }
      } catch (e) {
        console.error('Failed to restore auth session', e);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; teacher: Teacher }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(TEACHER_KEY, JSON.stringify(data.teacher));
    setToken(data.token);
    setTeacher(data.teacher);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await apiFetch<{ token: string; teacher: Teacher }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(TEACHER_KEY, JSON.stringify(data.teacher));
    setToken(data.token);
    setTeacher(data.teacher);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, TEACHER_KEY]);
    setToken(null);
    setTeacher(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      token,
      teacher,
      isLoading,
      isAuthenticated: !!token,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
