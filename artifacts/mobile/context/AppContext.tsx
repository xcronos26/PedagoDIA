import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const DEFAULT_SUBJECTS = ['Matemática', 'Português', 'Ciências', 'História', 'Geografia', 'Arte', 'Educação Física', 'Inglês'];

interface AppContextValue {
  students: Student[];
  attendance: AttendanceRecord[];
  activities: Activity[];
  deliveries: DeliveryRecord[];
  subjects: string[];
  isLoaded: boolean;
  loadData: () => Promise<void>;
  addStudent: (name: string) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;
  editStudent: (id: string, newName: string) => Promise<void>;
  toggleAttendance: (studentId: string, date: string) => Promise<void>;
  justifyAbsence: (studentId: string, date: string, justification: string) => Promise<void>;
  setAttendanceRecord: (studentId: string, date: string, present: boolean) => Promise<void>;
  getAttendanceForDate: (date: string) => AttendanceRecord[];
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  toggleDelivery: (activityId: string, studentId: string) => Promise<void>;
  toggleSeen: (activityId: string, studentId: string) => Promise<void>;
  getDeliveriesForActivity: (activityId: string) => DeliveryRecord[];
  getDeliveriesForStudent: (studentId: string) => DeliveryRecord[];
  addSubject: (subject: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  STUDENTS: '@caderneta:students',
  ATTENDANCE: '@caderneta:attendance',
  ACTIVITIES: '@caderneta:activities',
  DELIVERIES: '@caderneta:deliveries',
  SUBJECTS: '@caderneta:subjects',
};

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [studentsJson, attendanceJson, activitiesJson, deliveriesJson, subjectsJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.STUDENTS),
        AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES),
        AsyncStorage.getItem(STORAGE_KEYS.DELIVERIES),
        AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS),
      ]);
      if (studentsJson) setStudents(JSON.parse(studentsJson));
      if (attendanceJson) {
        const parsed: AttendanceRecord[] = JSON.parse(attendanceJson);
        setAttendance(parsed);
      }
      if (activitiesJson) setActivities(JSON.parse(activitiesJson));
      if (deliveriesJson) {
        const parsed: DeliveryRecord[] = JSON.parse(deliveriesJson);
        // Migrate old records that don't have seen field
        setDeliveries(parsed.map(d => ({ seen: false, ...d })));
      }
      if (subjectsJson) setSubjects(JSON.parse(subjectsJson));
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveStudents = async (data: Student[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data));
    setStudents(data);
  };

  const saveAttendance = async (data: AttendanceRecord[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(data));
    setAttendance(data);
  };

  const saveActivities = async (data: Activity[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(data));
    setActivities(data);
  };

  const saveDeliveries = async (data: DeliveryRecord[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(data));
    setDeliveries(data);
  };

  const saveSubjects = async (data: string[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(data));
    setSubjects(data);
  };

  const addStudent = useCallback(async (name: string) => {
    const newStudent: Student = {
      id: generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...students, newStudent].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    await saveStudents(updated);
  }, [students]);

  const removeStudent = useCallback(async (id: string) => {
    await saveStudents(students.filter(s => s.id !== id));
    await saveAttendance(attendance.filter(a => a.studentId !== id));
    await saveDeliveries(deliveries.filter(d => d.studentId !== id));
  }, [students, attendance, deliveries]);

  const editStudent = useCallback(async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = students
      .map(s => s.id === id ? { ...s, name: trimmed } : s)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    await saveStudents(updated);
  }, [students]);

  const toggleAttendance = useCallback(async (studentId: string, date: string) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    let updated: AttendanceRecord[];
    if (existing) {
      updated = attendance.map(a =>
        a.studentId === studentId && a.date === date
          ? { ...a, present: !a.present, justified: false, justification: undefined }
          : a
      );
    } else {
      updated = [...attendance, { studentId, date, present: false, justified: false }];
    }
    await saveAttendance(updated);
  }, [attendance]);

  const setAttendanceRecord = useCallback(async (studentId: string, date: string, present: boolean) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    let updated: AttendanceRecord[];
    if (existing) {
      updated = attendance.map(a =>
        a.studentId === studentId && a.date === date
          ? { ...a, present, justified: false, justification: undefined }
          : a
      );
    } else {
      updated = [...attendance, { studentId, date, present, justified: false }];
    }
    await saveAttendance(updated);
  }, [attendance]);

  const justifyAbsence = useCallback(async (studentId: string, date: string, justification: string) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    let updated: AttendanceRecord[];
    if (existing) {
      updated = attendance.map(a =>
        a.studentId === studentId && a.date === date
          ? { ...a, present: false, justified: true, justification }
          : a
      );
    } else {
      updated = [...attendance, { studentId, date, present: false, justified: true, justification }];
    }
    await saveAttendance(updated);
  }, [attendance]);

  const getAttendanceForDate = useCallback((date: string) => {
    return attendance.filter(a => a.date === date);
  }, [attendance]);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id' | 'createdAt'>) => {
    const newActivity: Activity = {
      ...activity,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...activities, newActivity].sort((a, b) => b.date.localeCompare(a.date));
    await saveActivities(updated);
  }, [activities]);

  const removeActivity = useCallback(async (id: string) => {
    await saveActivities(activities.filter(a => a.id !== id));
    await saveDeliveries(deliveries.filter(d => d.activityId !== id));
  }, [activities, deliveries]);

  const toggleDelivery = useCallback(async (activityId: string, studentId: string) => {
    const existing = deliveries.find(d => d.activityId === activityId && d.studentId === studentId);
    let updated: DeliveryRecord[];
    if (existing) {
      const nowDelivered = !existing.delivered;
      updated = deliveries.map(d =>
        d.activityId === activityId && d.studentId === studentId
          ? { ...d, delivered: nowDelivered, deliveredAt: nowDelivered ? new Date().toISOString() : undefined }
          : d
      );
    } else {
      updated = [...deliveries, {
        activityId,
        studentId,
        delivered: true,
        seen: false,
        deliveredAt: new Date().toISOString(),
      }];
    }
    await saveDeliveries(updated);
  }, [deliveries]);

  const toggleSeen = useCallback(async (activityId: string, studentId: string) => {
    const existing = deliveries.find(d => d.activityId === activityId && d.studentId === studentId);
    let updated: DeliveryRecord[];
    if (existing) {
      const nowSeen = !existing.seen;
      updated = deliveries.map(d =>
        d.activityId === activityId && d.studentId === studentId
          ? { ...d, seen: nowSeen, seenAt: nowSeen ? new Date().toISOString() : undefined }
          : d
      );
    } else {
      updated = [...deliveries, {
        activityId,
        studentId,
        delivered: false,
        seen: true,
        seenAt: new Date().toISOString(),
      }];
    }
    await saveDeliveries(updated);
  }, [deliveries]);

  const getDeliveriesForActivity = useCallback((activityId: string) => {
    return deliveries.filter(d => d.activityId === activityId);
  }, [deliveries]);

  const getDeliveriesForStudent = useCallback((studentId: string) => {
    return deliveries.filter(d => d.studentId === studentId);
  }, [deliveries]);

  const addSubject = useCallback(async (subject: string) => {
    const trimmed = subject.trim();
    if (!trimmed || subjects.includes(trimmed)) return;
    const updated = [...subjects, trimmed].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    await saveSubjects(updated);
  }, [subjects]);

  return (
    <AppContext.Provider value={{
      students,
      attendance,
      activities,
      deliveries,
      subjects,
      isLoaded,
      loadData,
      addStudent,
      removeStudent,
      editStudent,
      toggleAttendance,
      justifyAbsence,
      setAttendanceRecord,
      getAttendanceForDate,
      addActivity,
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
