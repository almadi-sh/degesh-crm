import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

export interface ContractItem {
  id: number;
  contract_id: number;
  product_id: number;
  quantity: number;
  price: number;
  total_amount: number;
  vat_enabled: boolean;
  delivery_enabled: boolean;
  delivery_terms?: string | null;
  appendix_number: number;
}

export interface ContractItemInsert {
  contract_id: number;
  product_id: number;
  quantity: number;
  price: number;
  vat_enabled: boolean;
  delivery_enabled: boolean;
  delivery_terms?: string | null;
  appendix_number: number;
}

export type ContractItemUpdate = Partial<ContractItemInsert>;

export interface ContractItemFilters {
  customer_id?: number;
  contract_id?: number;
}

export function useContractItems(filters?: ContractItemFilters) {
  return useQuery({
    queryKey: ["contract-items", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.customer_id) params.set("customer_id", String(filters.customer_id));
      if (filters?.contract_id) params.set("contract_id", String(filters.contract_id));
      const query = params.toString();
      return apiFetch<ContractItem[]>(`/api/v1/contract-items/${query ? `?${query}` : ""}`);
    },
  });
}

export function useCreateContractItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ContractItemInsert) => {
      return apiFetch<ContractItem>("/api/v1/contract-items/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-items"] });
      toast.success("Позиция договора успешно создана");
    },
    onError: (error) => {
      toast.error("Не удалось создать позицию договора: " + error.message);
    },
  });
}

export function useUpdateContractItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & ContractItemUpdate) => {
      return apiFetch<ContractItem>(`/api/v1/contract-items/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-items"] });
      toast.success("Позиция договора успешно обновлена");
    },
    onError: (error) => {
      toast.error("Не удалось обновить позицию договора: " + error.message);
    },
  });
}

export function useDeleteContractItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch<void>(`/api/v1/contract-items/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-items"] });
      toast.success("Позиция договора успешно удалена");
    },
    onError: (error) => {
      toast.error("Не удалось удалить позицию договора: " + error.message);
    },
  });
}
