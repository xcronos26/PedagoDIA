import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Student {
  id: string;
  name: string;
  classId: string | null;
  createdAt: string;
}

export function useStudents(classId?: string | null) {
  return useQuery<Student[]>({
    queryKey: ['students', classId ?? 'all'],
    queryFn: () => apiFetch('/students' + (classId ? `?classId=${classId}` : '')),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; classId?: string | null }) =>
      apiFetch('/students', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, classId }: { id: string; name?: string; classId?: string | null }) =>
      apiFetch(`/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, classId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}
