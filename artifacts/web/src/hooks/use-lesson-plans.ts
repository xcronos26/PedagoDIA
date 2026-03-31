import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface LessonPlan {
  id: string;
  date: string;
  description: string;
  activityIds: string[];
  createdAt: string;
}

export function useLessonPlans(month: string) {
  return useQuery<LessonPlan[]>({
    queryKey: ['lesson-plans', month],
    queryFn: () => apiFetch(`/lesson-plans?month=${month}`),
    enabled: !!month,
  });
}

export function useUpsertLessonPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; description: string }) =>
      apiFetch('/lesson-plans', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      const month = vars.date.substring(0, 7);
      queryClient.invalidateQueries({ queryKey: ['lesson-plans', month] });
    },
  });
}

export function useLinkActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, activityId }: { planId: string; activityId: string }) =>
      apiFetch(`/lesson-plans/${planId}/activities`, {
        method: 'POST',
        body: JSON.stringify({ activityId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-plans'] }),
  });
}

export function useUnlinkActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, activityId }: { planId: string; activityId: string }) =>
      apiFetch(`/lesson-plans/${planId}/activities/${activityId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-plans'] }),
  });
}
