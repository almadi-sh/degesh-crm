import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

export interface ContractItem {
  id?: number;
  product_id: number;
  quantity: number;
  price: number;
  total_amount: number;
  delivery_enabled: boolean;
  delivery_terms?: string | null;
}

export interface Contract {
  id: number;
  customer_id: number;
  contract_number: string;
  contract_date: string;
  status: "Draft" | "Confirmed" | "Sent";
  last_modified_at: string;
  items: ContractItem[];
}

export interface ContractInsert {
  customer_id: number;
}

export type ContractUpdate = { status: "Draft" | "Confirmed" | "Sent" };

export interface ContractFilters {
  customer_id?: number;
  contract_number?: string;
}

export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: ["contracts", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.customer_id) params.set("customer_id", String(filters.customer_id));
      if (filters?.contract_number) params.set("contract_number", filters.contract_number);
      const query = params.toString();
      return apiFetch<Contract[]>(`/api/v1/contracts${query ? `?${query}` : ""}`);
    },
  });
}

export function useContract(id?: number) {
  return useQuery({
    queryKey: ["contracts", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Contract id is required");
      }
      return apiFetch<Contract>(`/api/v1/contracts/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contract: ContractInsert) => {
      return apiFetch<Contract>("/api/v1/contracts", {
        method: "POST",
        body: JSON.stringify(contract),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create contract: " + error.message);
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & ContractUpdate) => {
      return apiFetch<Contract>(`/api/v1/contracts/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("Contract updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update contract: " + error.message);
    },
  });
}
