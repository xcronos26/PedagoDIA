import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Student {
  id: string;
  name: string;
  createdAt: string;
}

export function useStudents() {
  return useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => apiFetch('/students'),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => apiFetch('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiFetch(`/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/students/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}
