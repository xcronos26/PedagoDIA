import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface EscolaMembro {
  memberId: string;
  memberRole: "admin_institucional" | "professor";
  joinedAt: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  planType: string;
  isBlocked: boolean;
}

export interface EscolaDashboard {
  escola: {
    id: string;
    name: string;
    status: "ativa" | "inativa";
    inviteCode: string;
  };
  stats: {
    totalProfessores: number;
    totalAtividades: number;
    totalGeneracoesIA: number;
  };
  professores: EscolaMembro[];
}

export interface MySchool {
  membershipId: string;
  role: "admin_institucional" | "professor";
  status: "pendente" | "ativo";
  joinedAt: string;
  schoolId: string;
  schoolName: string;
  schoolStatus: "ativa" | "inativa";
  inviteCode: string;
}

export function useEscolaDashboard() {
  return useQuery<EscolaDashboard>({
    queryKey: ["escola", "dashboard"],
    queryFn: () => apiFetch("/escola/dashboard"),
    retry: false,
  });
}

export function useMySchools() {
  return useQuery<MySchool[]>({
    queryKey: ["schools", "mine"],
    queryFn: () => apiFetch("/schools/mine"),
  });
}

export function useJoinSchool() {
  return useMutation({
    mutationFn: (inviteCode: string) =>
      apiFetch("/schools/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      }),
  });
}

export function useCreateSchool() {
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch("/schools", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
  });
}
