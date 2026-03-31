import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface InventoryItem {
  id: number;
  product_id: number;
  quantity_available: number;
  quantity_reserved: number;
}

export interface InventorySnapshotItem {
  product_id: number;
  product_name: string;
  supplier_name: string;
  incoming_total: number;
  reserved_total: number;
  available_total: number;
  balance: number;
}

export interface ReservationTimelineItem {
  reservation_id: number;
  employee_name: string;
  contract_number: string;
  contract_id: number;
  appendix_number: number;
  quantity: number;
  product_name: string;
  delivery_terms?: string | null;
  delivery_due_date?: string | null;
  customer_name: string;
  priority: number;
}

export interface InventoryReceipt {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  received_at: string;
  supplier_id?: number | null;
  supplier_contract_number?: string | null;
  supplier_name?: string | null;
  comment?: string | null;
}

export interface CreateInventoryReceiptPayload {
  product_id: number;
  quantity: number;
  supplier_id: number;
  supplier_contract_number?: string;
  comment?: string;
}

export interface InventoryFilters {
  product_id?: number;
}

export interface InventorySnapshotFilters {
  product_id?: number;
  search?: string;
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

export function useInventorySnapshot(filters?: InventorySnapshotFilters) {
  return useQuery({
    queryKey: ["inventory-snapshot", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.product_id) params.set("product_id", String(filters.product_id));
      if (filters?.search) params.set("search", filters.search);
      const query = params.toString();
      return apiFetch<InventorySnapshotItem[]>(`/api/v1/inventory/snapshot${query ? `?${query}` : ""}`);
    },
  });
}

export function useReservationsTimeline(productId?: number) {
  return useQuery({
    queryKey: ["reservations-timeline", productId],
    queryFn: async () => {
      if (!productId) {
        throw new Error("Product id is required");
      }
      return apiFetch<ReservationTimelineItem[]>(`/api/v1/inventory/${productId}/reservations-timeline`);
    },
    enabled: !!productId,
  });
}

export function useReservationsFeed() {
  return useQuery({
    queryKey: ["reservations-feed"],
    queryFn: async () => apiFetch<ReservationTimelineItem[]>("/api/v1/inventory/reservations"),
  });
}

export function useInventoryReceipts() {
  return useQuery({
    queryKey: ["inventory-receipts"],
    queryFn: async () => apiFetch<InventoryReceipt[]>("/api/v1/inventory/receipts"),
  });
}

export function useCreateInventoryReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInventoryReceiptPayload) => {
      return apiFetch<InventoryReceipt>("/api/v1/inventory/receipts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
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
      queryClient.invalidateQueries({ queryKey: ["inventory-snapshot"] });
    },
  });
}
