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
};

interface AppContextValue {
  students: Student[];
  attendance: AttendanceRecord[];
  activities: Activity[];
  deliveries: DeliveryRecord[];
  isLoaded: boolean;
  loadData: () => Promise<void>;
  addStudent: (name: string) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;
  toggleAttendance: (studentId: string, date: string) => Promise<void>;
  getAttendanceForDate: (date: string) => AttendanceRecord[];
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  toggleDelivery: (activityId: string, studentId: string) => Promise<void>;
  getDeliveriesForActivity: (activityId: string) => DeliveryRecord[];
  getDeliveriesForStudent: (studentId: string) => DeliveryRecord[];
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  STUDENTS: '@caderneta:students',
  ATTENDANCE: '@caderneta:attendance',
  ACTIVITIES: '@caderneta:activities',
  DELIVERIES: '@caderneta:deliveries',
};

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [studentsJson, attendanceJson, activitiesJson, deliveriesJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.STUDENTS),
        AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES),
        AsyncStorage.getItem(STORAGE_KEYS.DELIVERIES),
      ]);
      if (studentsJson) setStudents(JSON.parse(studentsJson));
      if (attendanceJson) setAttendance(JSON.parse(attendanceJson));
      if (activitiesJson) setActivities(JSON.parse(activitiesJson));
      if (deliveriesJson) setDeliveries(JSON.parse(deliveriesJson));
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

  const addStudent = useCallback(async (name: string) => {
    const newStudent: Student = {
      id: generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...students, newStudent].sort((a, b) => a.name.localeCompare(b.name));
    await saveStudents(updated);
  }, [students]);

  const removeStudent = useCallback(async (id: string) => {
    await saveStudents(students.filter(s => s.id !== id));
    await saveAttendance(attendance.filter(a => a.studentId !== id));
    await saveDeliveries(deliveries.filter(d => d.studentId !== id));
  }, [students, attendance, deliveries]);

  const toggleAttendance = useCallback(async (studentId: string, date: string) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    let updated: AttendanceRecord[];
    if (existing) {
      updated = attendance.map(a =>
        a.studentId === studentId && a.date === date
          ? { ...a, present: !a.present }
          : a
      );
    } else {
      updated = [...attendance, { studentId, date, present: false }];
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
      updated = deliveries.map(d =>
        d.activityId === activityId && d.studentId === studentId
          ? { ...d, delivered: !d.delivered }
          : d
      );
    } else {
      updated = [...deliveries, { activityId, studentId, delivered: true }];
    }
    await saveDeliveries(updated);
  }, [deliveries]);

  const getDeliveriesForActivity = useCallback((activityId: string) => {
    return deliveries.filter(d => d.activityId === activityId);
  }, [deliveries]);

  const getDeliveriesForStudent = useCallback((studentId: string) => {
    return deliveries.filter(d => d.studentId === studentId);
  }, [deliveries]);

  return (
    <AppContext.Provider value={{
      students,
      attendance,
      activities,
      deliveries,
      isLoaded,
      loadData,
      addStudent,
      removeStudent,
      toggleAttendance,
      getAttendanceForDate,
      addActivity,
      removeActivity,
      toggleDelivery,
      getDeliveriesForActivity,
      getDeliveriesForStudent,
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
