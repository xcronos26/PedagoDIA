import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Delivery {
  id: string;
  activityId: string;
  studentId: string;
  delivered: boolean;
  seen: boolean;
  deliveredAt?: string;
  seenAt?: string;
}

export function useDeliveries(activityId?: string) {
  return useQuery<Delivery[]>({
    queryKey: ['deliveries', activityId],
    queryFn: () => apiFetch(activityId ? `/deliveries?activityId=${activityId}` : '/deliveries'),
  });
}

export function useAllDeliveries() {
  return useQuery<Delivery[]>({
    queryKey: ['deliveries'],
    queryFn: () => apiFetch('/deliveries'),
  });
}

export function useToggleDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { activityId: string; studentId: string; delivered: boolean; seen?: boolean }) => apiFetch('/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deliveries', variables.activityId] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}
