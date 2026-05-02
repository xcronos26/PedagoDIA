import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type TipoQuestaoSimples = "multipla_escolha" | "dissertativa";

export interface AlternativasQuestao {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface Question {
  id: string;
  teacherId: string;
  enunciado: string;
  alternativas: AlternativasQuestao | null;
  resposta_correta: string | null;
  descritivo: string;
  disciplina: string;
  serieTurma: string;
  tipoQuestao: TipoQuestaoSimples;
  tags: string[];
  criadaEm: string;
}

export interface CreateQuestionInput {
  enunciado: string;
  alternativas?: AlternativasQuestao | null;
  resposta_correta?: string | null;
  descritivo?: string;
  disciplina?: string;
  serieTurma?: string;
  tipoQuestao?: TipoQuestaoSimples;
  tags?: string[];
}

export function useQuestions() {
  return useQuery<Question[]>({
    queryKey: ["questions"],
    queryFn: () => apiFetch("/questions"),
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuestionInput) =>
      apiFetch<Question>("/questions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}

export function useBulkSaveQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questions: CreateQuestionInput[]) =>
      apiFetch<Question[]>("/questions/bulk", {
        method: "POST",
        body: JSON.stringify({ questions }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateQuestionInput>) =>
      apiFetch<Question>(`/questions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions"] }),
  });
}
