import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

export interface Supplier {
  id: number;
  name: string;
  legal_form?: string | null;
  supplier_scope?: "international" | "domestic" | null;
  product_type?: "pesticide" | "fertilizer" | "seeds" | null;
  bin_iin?: string | null;
  city?: string | null;
  legal_address?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  created_by_user?: string | null;
}

export type SupplierInsert = Omit<Supplier, "id">;
export type SupplierUpdate = Partial<SupplierInsert>;

export interface SupplierFilters {
  name?: string;
  bin_iin?: string;
  city?: string;
  contact_person?: string;
  supplier_scope?: "international" | "domestic";
  product_type?: "pesticide" | "fertilizer" | "seeds";
}

export function useSuppliers(filters?: SupplierFilters) {
  return useQuery({
    queryKey: ["suppliers", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.name) params.set("name", filters.name);
      if (filters?.bin_iin) params.set("bin_iin", filters.bin_iin);
      if (filters?.city) params.set("city", filters.city);
      if (filters?.contact_person) params.set("contact_person", filters.contact_person);
      if (filters?.supplier_scope) params.set("supplier_scope", filters.supplier_scope);
      if (filters?.product_type) params.set("product_type", filters.product_type);
      const query = params.toString();
      return apiFetch<Supplier[]>(`/api/v1/suppliers/${query ? `?${query}` : ""}`);
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: SupplierInsert) =>
      apiFetch<Supplier>("/api/v1/suppliers/", {
        method: "POST",
        body: JSON.stringify(supplier),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Поставщик создан");
    },
    onError: (error) => toast.error("Не удалось создать поставщика: " + error.message),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiFetch<void>(`/api/v1/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-items"] });
      toast.success("Поставщик удален");
    },
    onError: (error) => toast.error("Не удалось удалить поставщика: " + error.message),
  });
}


export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & SupplierUpdate) =>
      apiFetch<Supplier>(`/api/v1/suppliers/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Поставщик обновлен");
    },
    onError: (error) => toast.error("Не удалось обновить поставщика: " + error.message),
  });
}
