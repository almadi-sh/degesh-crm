import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  city?: string | null;
}

export interface EmployeeFilters {
  role?: string;
}

export function useEmployees(filters?: EmployeeFilters) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.role) params.set("role", filters.role);
      const query = params.toString();
      return apiFetch<Employee[]>(`/api/v1/employees/${query ? `?${query}` : ""}`);
    },
  });
}
