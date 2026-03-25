import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { apiFetch, ApiError } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';

export type Student = {
  id: string;
  name: string;
  createdAt: string;
};

export type AttendanceRecord = {
  studentId: string;
  date: string;
  present: boolean;
  justified?: boolean;
  justification?: string;
};

export type Activity = {
  id: string;
  subject: string;
  type: 'homework' | 'classwork';
  link?: string;
  date: string;
  description: string;
  createdAt: string;
};

export type DeliveryRecord = {
  activityId: string;
  studentId: string;
  delivered: boolean;
  seen: boolean;
  deliveredAt?: string;
  seenAt?: string;
};

interface AppContextValue {
  students: Student[];
  attendance: AttendanceRecord[];
  activities: Activity[];
  deliveries: DeliveryRecord[];
  subjects: string[];
  isLoaded: boolean;
  loadError: string | null;
  loadData: () => Promise<void>;
  addStudent: (name: string) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;
  editStudent: (id: string, newName: string) => Promise<void>;
  toggleAttendance: (studentId: string, date: string) => Promise<void>;
  justifyAbsence: (studentId: string, date: string, justification: string) => Promise<void>;
  setAttendanceRecord: (studentId: string, date: string, present: boolean) => Promise<void>;
  getAttendanceForDate: (date: string) => AttendanceRecord[];
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<void>;
  updateActivity: (id: string, updates: Partial<Omit<Activity, 'id' | 'createdAt'>>) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  toggleDelivery: (activityId: string, studentId: string) => Promise<void>;
  toggleSeen: (activityId: string, studentId: string) => Promise<void>;
  getDeliveriesForActivity: (activityId: string) => DeliveryRecord[];
  getDeliveriesForStudent: (studentId: string) => DeliveryRecord[];
  addSubject: (subject: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

type ApiStudent = { id: string; name: string; createdAt: string };
type ApiActivity = { id: string; subject: string; type: string; link?: string; date: string; description: string; createdAt: string };
type ApiAttendance = { id: string; studentId: string; date: string; present: boolean; justified?: boolean; justification?: string };
type ApiDelivery = { id: string; activityId: string; studentId: string; delivered: boolean; seen: boolean; deliveredAt?: string; seenAt?: string };
type ApiSubject = { id: string; name: string };

export function AppProvider({ children }: { children: ReactNode }) {
  const { token, logout } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handle401 = useCallback(async (err: unknown) => {
    const apiErr = err as ApiError;
    if (apiErr?.status === 401) {
      await logout();
      return true;
    }
    return false;
  }, [logout]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoadError(null);
    try {
      const [studentsData, activitiesData, attendanceData, deliveriesData, subjectsData] = await Promise.all([
        apiFetch<ApiStudent[]>('/students', { token }),
        apiFetch<ApiActivity[]>('/activities', { token }),
        apiFetch<ApiAttendance[]>('/attendance', { token }),
        apiFetch<ApiDelivery[]>('/deliveries', { token }),
        apiFetch<ApiSubject[]>('/subjects', { token }),
      ]);

      const sortedStudents = studentsData.sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      );
      setStudents(sortedStudents);

      const sortedActivities = activitiesData
        .map(a => ({ ...a, type: a.type as 'homework' | 'classwork' }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setActivities(sortedActivities);

      setAttendance(attendanceData.map(r => ({
        studentId: r.studentId,
        date: r.date,
        present: r.present,
        justified: r.justified ?? false,
        justification: r.justification,
      })));

      setDeliveries(deliveriesData.map(d => ({
        activityId: d.activityId,
        studentId: d.studentId,
        delivered: d.delivered,
        seen: d.seen,
        deliveredAt: d.deliveredAt,
        seenAt: d.seenAt,
      })));

      setSubjects(subjectsData.map(s => s.name).sort((a, b) => a.localeCompare(b, 'pt-BR')));
    } catch (e) {
      const was401 = await handle401(e);
      if (!was401) {
        const msg = (e as ApiError)?.message ?? 'Erro ao carregar dados. Verifique sua conexão.';
        setLoadError(msg);
        console.error('Failed to load data from API', e);
      }
    } finally {
      setIsLoaded(true);
    }
  }, [token, handle401]);

  useEffect(() => {
    if (token) {
      setIsLoaded(false);
      setLoadError(null);
      loadData();
    } else {
      setStudents([]);
      setAttendance([]);
      setActivities([]);
      setDeliveries([]);
      setSubjects([]);
      setIsLoaded(false);
      setLoadError(null);
    }
  }, [token]);

  const withErrorHandling = useCallback(async (fn: () => Promise<void>, fallback?: string) => {
    try {
      await fn();
    } catch (e) {
      const was401 = await handle401(e);
      if (!was401) {
        const msg = (e as ApiError)?.message ?? fallback ?? 'Ocorreu um erro. Tente novamente.';
        Alert.alert('Erro', msg);
      }
    }
  }, [handle401]);

  const addStudent = useCallback(async (name: string) => {
    if (!token) return;
    await withErrorHandling(async () => {
      const student = await apiFetch<ApiStudent>('/students', {
        method: 'POST',
        body: JSON.stringify({ name }),
        token,
      });
      setStudents(prev =>
        [...prev, student].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      );
    });
  }, [token, withErrorHandling]);

  const removeStudent = useCallback(async (id: string) => {
    if (!token) return;
    await withErrorHandling(async () => {
      await apiFetch(`/students/${id}`, { method: 'DELETE', token });
      setStudents(prev => prev.filter(s => s.id !== id));
      setAttendance(prev => prev.filter(a => a.studentId !== id));
      setDeliveries(prev => prev.filter(d => d.studentId !== id));
    });
  }, [token, withErrorHandling]);

  const editStudent = useCallback(async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || !token) return;
    await withErrorHandling(async () => {
      const student = await apiFetch<ApiStudent>(`/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: trimmed }),
        token,
      });
      setStudents(prev =>
        prev
          .map(s => s.id === id ? { ...s, name: student.name } : s)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      );
    });
  }, [token, withErrorHandling]);

  const toggleAttendance = useCallback(async (studentId: string, date: string) => {
    if (!token) return;
    await withErrorHandling(async () => {
      const existing = attendance.find(a => a.studentId === studentId && a.date === date);
      const present = existing ? !existing.present : false;
      const record = await apiFetch<ApiAttendance>('/attendance', {
        method: 'POST',
        body: JSON.stringify({ studentId, date, present }),
        token,
      });
      setAttendance(prev => {
        const filtered = prev.filter(a => !(a.studentId === studentId && a.date === date));
        return [...filtered, { studentId: record.studentId, date: record.date, present: record.present, justified: record.justified ?? false, justification: record.justification }];
      });
    });
  }, [token, attendance, withErrorHandling]);

  const setAttendanceRecord = useCallback(async (studentId: string, date: string, present: boolean) => {
    if (!token) return;
    await withErrorHandling(async () => {
      const record = await apiFetch<ApiAttendance>('/attendance', {
        method: 'POST',
        body: JSON.stringify({ studentId, date, present }),
        token,
      });
      setAttendance(prev => {
        const filtered = prev.filter(a => !(a.studentId === studentId && a.date === date));
        return [...filtered, { studentId: record.studentId, date: record.date, present: record.present, justified: record.justified ?? false, justification: record.justification }];
      });
    });
  }, [token, withErrorHandling]);

  const justifyAbsence = useCallback(async (studentId: string, date: string, justification: string) => {
    if (!token) return;
    await withErrorHandling(async () => {
      const record = await apiFetch<ApiAttendance>('/attendance/justify', {
        method: 'POST',
        body: JSON.stringify({ studentId, date, justification }),
        token,
      });
      setAttendance(prev => {
        const filtered = prev.filter(a => !(a.studentId === studentId && a.date === date));
        return [...filtered, { studentId: record.studentId, date: record.date, present: record.present, justified: record.justified ?? true, justification: record.justification }];
      });
    });
  }, [token, withErrorHandling]);

  const getAttendanceForDate = useCallback((date: string) => {
    return attendance.filter(a => a.date === date);
  }, [attendance]);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id' | 'createdAt'>) => {
    if (!token) return;
    await withErrorHandling(async () => {
      const created = await apiFetch<ApiActivity>('/activities', {
        method: 'POST',
        body: JSON.stringify(activity),
        token,
      });
      setActivities(prev =>
        [...prev, { ...created, type: created.type as 'homework' | 'classwork' }].sort((a, b) => b.date.localeCompare(a.date))
      );
    });
  }, [token, withErrorHandling]);

  const updateActivity = useCallback(async (id: string, updates: Partial<Omit<Activity, 'id' | 'createdAt'>>) => {
    if (!token) return;
    const existing = activities.find(a => a.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    await withErrorHandling(async () => {
      const updated = await apiFetch<ApiActivity>(`/activities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(merged),
        token,
      });
      setActivities(prev =>
        prev
          .map(a => a.id === id ? { ...updated, type: updated.type as 'homework' | 'classwork' } : a)
          .sort((a, b) => b.date.localeCompare(a.date))
      );
    });
  }, [token, activities, withErrorHandling]);

  const removeActivity = useCallback(async (id: string) => {
    if (!token) return;
    await withErrorHandling(async () => {
      await apiFetch(`/activities/${id}`, { method: 'DELETE', token });
      setActivities(prev => prev.filter(a => a.id !== id));
      setDeliveries(prev => prev.filter(d => d.activityId !== id));
    });
  }, [token, withErrorHandling]);

  const toggleDelivery = useCallback(async (activityId: string, studentId: string) => {
    if (!token) return;
    await withErrorHandling(async () => {
      const existing = deliveries.find(d => d.activityId === activityId && d.studentId === studentId);
      const nowDelivered = existing ? !existing.delivered : true;
      const record = await apiFetch<ApiDelivery>('/deliveries', {
        method: 'POST',
        body: JSON.stringify({ activityId, studentId, delivered: nowDelivered, seen: existing?.seen ?? false }),
        token,
      });
      setDeliveries(prev => {
        const filtered = prev.filter(d => !(d.activityId === activityId && d.studentId === studentId));
        return [...filtered, { activityId: record.activityId, studentId: record.studentId, delivered: record.delivered, seen: record.seen, deliveredAt: record.deliveredAt, seenAt: record.seenAt }];
      });
    });
  }, [token, deliveries, withErrorHandling]);

  const toggleSeen = useCallback(async (activityId: string, studentId: string) => {
    if (!token) return;
    await withErrorHandling(async () => {
      const existing = deliveries.find(d => d.activityId === activityId && d.studentId === studentId);
      const nowSeen = existing ? !existing.seen : true;
      const record = await apiFetch<ApiDelivery>('/deliveries', {
        method: 'POST',
        body: JSON.stringify({ activityId, studentId, delivered: existing?.delivered ?? false, seen: nowSeen }),
        token,
      });
      setDeliveries(prev => {
        const filtered = prev.filter(d => !(d.activityId === activityId && d.studentId === studentId));
        return [...filtered, { activityId: record.activityId, studentId: record.studentId, delivered: record.delivered, seen: record.seen, deliveredAt: record.deliveredAt, seenAt: record.seenAt }];
      });
    });
  }, [token, deliveries, withErrorHandling]);

  const getDeliveriesForActivity = useCallback((activityId: string) => {
    return deliveries.filter(d => d.activityId === activityId);
  }, [deliveries]);

  const getDeliveriesForStudent = useCallback((studentId: string) => {
    return deliveries.filter(d => d.studentId === studentId);
  }, [deliveries]);

  const addSubject = useCallback(async (subject: string) => {
    const trimmed = subject.trim();
    if (!trimmed || subjects.includes(trimmed) || !token) return;
    await withErrorHandling(async () => {
      await apiFetch('/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
        token,
      });
      setSubjects(prev => [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    });
  }, [token, subjects, withErrorHandling]);

  return (
    <AppContext.Provider value={{
      students,
      attendance,
      activities,
      deliveries,
      subjects,
      isLoaded,
      loadError,
      loadData,
      addStudent,
      removeStudent,
      editStudent,
      toggleAttendance,
      justifyAbsence,
      setAttendanceRecord,
      getAttendanceForDate,
      addActivity,
      updateActivity,
      removeActivity,
      toggleDelivery,
      toggleSeen,
      getDeliveriesForActivity,
      getDeliveriesForStudent,
      addSubject,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
