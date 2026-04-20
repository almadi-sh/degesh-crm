import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface InventoryItem {
  id: number;
  product_id: number;
  supplier_id: number;
  quantity_available: number;
  quantity_reserved: number;
  customs_status: string;
  shipment_status: string;
}

export interface InventoryFilters {
  product_id?: number;
  supplier_id?: number;
}

export function useInventory(filters?: InventoryFilters) {
  return useQuery({
    queryKey: ["inventory", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.product_id) params.set("product_id", String(filters.product_id));
      if (filters?.supplier_id) params.set("supplier_id", String(filters.supplier_id));
      const query = params.toString();
      return apiFetch<InventoryItem[]>(`/api/v1/inventory${query ? `?${query}` : ""}`);
    },
  });
}
