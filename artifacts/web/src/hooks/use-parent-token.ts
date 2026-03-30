import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useGenerateParentToken() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (studentId: string) => apiFetch(`/students/${studentId}/generate-parent-token`, {
      method: 'POST',
    }),
    onSuccess: (_, studentId) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
