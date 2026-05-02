import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface DadosAutomaticos {
  faltas: number;
  faltasJustificadas: number;
  totalAulas: number;
  exams: Array<{ titulo: string; disciplina: string; valorTotal: number | null }>;
  atividades: Array<{ id: string; subject: string; date: string; type: string; description: string }>;
}

export interface ObservacaoDisciplina {
  nome: string;
  avancos: string;
  dificuldades: string;
}

export interface ObservacoesProfessor {
  disciplinas: ObservacaoDisciplina[];
  comportamental: string;
  estrategias: string;
  sintese: string;
}

export interface RelatorioBimestral {
  id: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  bimestre: number;
  anoLetivo: number;
  serieTurma: string;
  dadosAutomaticos: DadosAutomaticos | Record<string, unknown>;
  observacoesProfessor: ObservacoesProfessor | Record<string, unknown>;
  textoGerado: string | null;
  status: "rascunho" | "finalizado";
  createdAt: string;
  updatedAt: string;
}

export function useRelatoriosBimestrais(bimestre?: number, anoLetivo?: number) {
  const params = new URLSearchParams();
  if (bimestre) params.set("bimestre", String(bimestre));
  if (anoLetivo) params.set("anoLetivo", String(anoLetivo));
  return useQuery<RelatorioBimestral[]>({
    queryKey: ["relatorios-bimestrais", bimestre, anoLetivo],
    queryFn: () => apiFetch(`/relatorios-bimestrais?${params}`),
  });
}

export function useRelatoriosBimestraisStudent(studentId: string | null, bimestre?: number, anoLetivo?: number) {
  const params = new URLSearchParams();
  if (bimestre) params.set("bimestre", String(bimestre));
  if (anoLetivo) params.set("anoLetivo", String(anoLetivo));
  return useQuery<RelatorioBimestral[]>({
    queryKey: ["relatorios-bimestrais", "student", studentId, bimestre, anoLetivo],
    queryFn: () => apiFetch(`/relatorios-bimestrais/student/${studentId}?${params}`),
    enabled: !!studentId,
  });
}

export function useDadosAutomaticos(studentId: string | null, bimestre: number, anoLetivo: number) {
  return useQuery<DadosAutomaticos & { student: { id: string; name: string } }>({
    queryKey: ["relatorios-bimestrais", "dados", studentId, bimestre, anoLetivo],
    queryFn: () => apiFetch(`/relatorios-bimestrais/dados/${studentId}?bimestre=${bimestre}&anoLetivo=${anoLetivo}`),
    enabled: !!studentId && !!bimestre && !!anoLetivo,
  });
}

export function useSaveRelatorioBimestral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RelatorioBimestral> & { studentId: string; studentName: string; bimestre: number; anoLetivo: number; serieTurma: string }) =>
      apiFetch("/relatorios-bimestrais", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relatorios-bimestrais"] });
    },
  });
}

export function useUpdateRelatorioBimestral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<RelatorioBimestral> & { id: string }) =>
      apiFetch(`/relatorios-bimestrais/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relatorios-bimestrais"] });
    },
  });
}

export function useDeleteRelatorioBimestral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/relatorios-bimestrais/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relatorios-bimestrais"] });
    },
  });
}

export function useGerarRelatorioBimestral() {
  return useMutation({
    mutationFn: (data: {
      studentName: string;
      bimestre: number;
      anoLetivo: number;
      serieTurma?: string;
      teacherName?: string;
      schoolName?: string;
      dadosAutomaticos: DadosAutomaticos;
      observacoesProfessor: ObservacoesProfessor;
    }) => apiFetch("/relatorios-bimestrais/gerar", { method: "POST", body: JSON.stringify(data) }),
  });
}
