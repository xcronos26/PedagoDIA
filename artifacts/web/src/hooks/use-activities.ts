import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Activity {
  id: string;
  subject: string;
  type: 'homework' | 'classwork';
  link?: string;
  date: string;
  description: string;
  createdAt: string;
}

export function useActivities() {
  return useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => apiFetch('/activities'),
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Activity, 'id' | 'createdAt'>) => apiFetch('/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities'] }),
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Omit<Activity, 'createdAt'>) => apiFetch(`/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities'] }),
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/activities/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}
