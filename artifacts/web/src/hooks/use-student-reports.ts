import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface StudentReport {
  id: string;
  studentId: string;
  date: string;
  content: string;
  createdAt: string;
}

export function useStudentReports(studentId: string | null) {
  return useQuery<StudentReport[]>({
    queryKey: ['student-reports', studentId],
    queryFn: () => apiFetch(`/student-reports?studentId=${studentId}`),
    enabled: !!studentId,
  });
}

export function useCreateStudentReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { studentId: string; date: string; content: string }) =>
      apiFetch('/student-reports', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-reports', variables.studentId] });
    },
  });
}

export function useUpdateStudentReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date, content }: { id: string; date: string; content: string; studentId: string }) =>
      apiFetch(`/student-reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ date, content }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-reports', variables.studentId] });
    },
  });
}

export function useDeleteStudentReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; studentId: string }) =>
      apiFetch(`/student-reports/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-reports', variables.studentId] });
    },
  });
}
