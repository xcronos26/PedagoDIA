import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Subject {
  id: string;
  name: string;
}

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => apiFetch('/subjects'),
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => apiFetch('/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  });
}
