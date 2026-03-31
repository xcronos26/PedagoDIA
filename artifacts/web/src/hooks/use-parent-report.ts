import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface ParentReportData {
  student: {
    id: string;
    name: string;
  };
  stats: {
    attendance: {
      total: number;
      present: number;
      absent: number;
      percentage: number;
    };
    activities: {
      total: number;
      delivered: number;
      seen: number;
      percentage: number;
    };
  };
  attendance: Array<{
    id: string;
    date: string;
    present: boolean;
    justified: boolean;
    justification?: string;
  }>;
  activities: Array<{
    id: string;
    subject: string;
    type: "homework" | "classwork";
    date: string;
    description?: string;
    link?: string;
    delivered: boolean;
    seen: boolean;
  }>;
}

export function useParentReport(token: string) {
  return useQuery<ParentReportData>({
    queryKey: ['parent-report', token],
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${baseUrl}/relatorio/${token}`);
      
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Relatório não encontrado' : 'Erro ao carregar relatório');
      }
      
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });
}
