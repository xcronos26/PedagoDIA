import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { PlanType, TeacherRole } from "@workspace/db";

export interface AdminTeacher {
  id: string;
  name: string;
  email: string;
  role: TeacherRole;
  vinculo: "individual" | "escola";
  planType: PlanType;
  planStatus: string;
  isBlocked: boolean;
  createdAt: string;
}

export interface AdminSchool {
  id: string;
  name: string;
  inviteCode: string;
  status: "ativa" | "inativa";
  createdBy: string;
  createdAt: string;
  totalMembros: number;
}

export interface AdminStats {
  totalProfessores: number;
  totalEscolas: number;
  totalAtividades: number;
  totalGeneracoesIA: number;
  totalBloqueados: number;
  totalDiretores: number;
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch("/admin/stats"),
  });
}

export function useAdminTeachers() {
  return useQuery<AdminTeacher[]>({
    queryKey: ["admin", "teachers"],
    queryFn: () => apiFetch("/admin/teachers"),
  });
}

export function useAdminSchools() {
  return useQuery<AdminSchool[]>({
    queryKey: ["admin", "schools"],
    queryFn: () => apiFetch("/admin/schools"),
  });
}

export function useBlockTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      apiFetch(`/admin/teachers/${id}/block`, {
        method: "PATCH",
        body: JSON.stringify({ blocked }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "teachers"] }),
  });
}

export function useChangeTeacherRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: TeacherRole }) =>
      apiFetch(`/admin/teachers/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "teachers"] }),
  });
}

export function useChangeTeacherPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, planType }: { id: string; planType: PlanType }) =>
      apiFetch(`/admin/teachers/${id}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ planType }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "teachers"] }),
  });
}

export function useCreateAdminSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch("/admin/schools", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "schools"] }),
  });
}

export function useToggleSchoolStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ativa" | "inativa" }) =>
      apiFetch(`/admin/schools/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "schools"] }),
  });
}
