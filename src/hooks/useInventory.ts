import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface InventoryItem {
  id: number;
  product_id: number;
  quantity_available: number;
  quantity_reserved: number;
}

export interface InventoryFilters {
  product_id?: number;
}

export type InventoryUpdate = Partial<Omit<InventoryItem, "id" | "product_id">>;

export function useInventory(filters?: InventoryFilters) {
  return useQuery({
    queryKey: ["inventory", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.product_id) params.set("product_id", String(filters.product_id));
      const query = params.toString();
      return apiFetch<InventoryItem[]>(`/api/v1/inventory/${query ? `?${query}` : ""}`);
    },
  });
}

export function useInventoryItem(id?: number) {
  return useQuery({
    queryKey: ["inventory", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Inventory item id is required");
      }
      return apiFetch<InventoryItem>(`/api/v1/inventory/${id}`);
    },
    enabled: !!id,
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & InventoryUpdate) => {
      return apiFetch<InventoryItem>(`/api/v1/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
