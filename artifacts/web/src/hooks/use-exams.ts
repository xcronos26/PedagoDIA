import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type TipoQuestao = "multipla_escolha" | "dissertativa" | "misto";
export type OrigemProva = "ia" | "atividades" | "misto";
export type StatusProva = "rascunho" | "ativa" | "finalizada";

export interface Questao {
  numero: number;
  enunciado: string;
  alternativas?: { A: string; B: string; C: string; D: string };
  resposta_correta?: string;
  descritivo: string;
}

export interface Gabarito {
  [numero: number]: string;
}

export interface Exam {
  id: string;
  titulo: string;
  disciplina: string;
  serieTurma: string;
  tema: string;
  numeroQuestoes: string;
  valorTotal: string;
  valorPorQuestao: string;
  tipoQuestao: TipoQuestao;
  origem: OrigemProva;
  atividadesBaseIds: string[];
  questoes: Questao[];
  gabarito: Gabarito;
  status: StatusProva;
  nomeEscola: string | null;
  criadaEm: string;
  atualizadaEm: string;
}

export interface CreateExamInput {
  titulo: string;
  disciplina: string;
  serieTurma: string;
  tema: string;
  numeroQuestoes: string;
  valorTotal: string;
  tipoQuestao: TipoQuestao;
  origem: OrigemProva;
  atividadesBaseIds?: string[];
  questoes: Questao[];
  gabarito: Gabarito;
  status: StatusProva;
  nomeEscola?: string;
}

export interface GenerateExamInput {
  disciplina: string;
  serieTurma: string;
  tema: string;
  nivelDificuldade: string;
  numeroQuestoes: number;
  tipoQuestao: TipoQuestao;
  atividadesBase?: Array<{ tema: string; descricao: string }>;
}

export function useExams() {
  return useQuery<Exam[]>({
    queryKey: ["exams"],
    queryFn: () => apiFetch("/exams"),
  });
}

export function useExam(id: string) {
  return useQuery<Exam>({
    queryKey: ["exams", id],
    queryFn: () => apiFetch(`/exams/${id}`),
    enabled: !!id,
  });
}

export function useCreateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExamInput) =>
      apiFetch<Exam>("/exams", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useUpdateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<CreateExamInput>) =>
      apiFetch<Exam>(`/exams/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useDeleteExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/exams/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useGenerateExam() {
  return useMutation({
    mutationFn: (data: GenerateExamInput) =>
      apiFetch<{ questoes: Questao[] }>("/ai/generate-exam", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}
