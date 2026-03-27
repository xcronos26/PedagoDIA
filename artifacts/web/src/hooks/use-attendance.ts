import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  present: boolean;
  justified: boolean;
  justification?: string;
}

export function useAllAttendance() {
  return useQuery<AttendanceRecord[]>({
    queryKey: ['attendance'],
    queryFn: () => apiFetch('/attendance'),
  });
}

export function useAttendanceByDate(date: string) {
  return useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', date],
    queryFn: () => apiFetch(`/attendance?date=${date}`),
    enabled: !!date,
  });
}

export function useToggleAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { studentId: string; date: string; present: boolean }) => apiFetch('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useJustifyAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { studentId: string; date: string; justification: string }) => apiFetch('/attendance/justify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
