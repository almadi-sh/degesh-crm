import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

export type SupplierItemType = "service" | "seeds" | "pesticide" | "fertilizer";

export interface SupplierItem {
  id: number;
  supplier_id: number;
  name: string;
  quantity_available: number;
  purchase_price: number;
  item_type: SupplierItemType;
  unit: string;
  is_active: boolean;
}

export type SupplierItemInsert = Omit<SupplierItem, "id">;
export type SupplierItemUpdate = Partial<Omit<SupplierItemInsert, "supplier_id">>;

export function useSupplierItems(supplierId?: number) {
  return useQuery({
    queryKey: ["supplier-items", supplierId],
    queryFn: async () =>
      apiFetch<SupplierItem[]>(`/api/v1/supplier-items/${supplierId ? `?supplier_id=${supplierId}` : ""}`),
  });
}

export function useCreateSupplierItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: SupplierItemInsert) =>
      apiFetch<SupplierItem>("/api/v1/supplier-items/", {
        method: "POST",
        body: JSON.stringify(item),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-items"] });
      toast.success("Позиция поставщика добавлена");
    },
    onError: (error) => toast.error("Не удалось добавить позицию: " + error.message),
  });
}

export function useDeleteSupplierItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => apiFetch<void>(`/api/v1/supplier-items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-items"] });
      toast.success("Позиция удалена");
    },
    onError: (error) => toast.error("Не удалось удалить позицию: " + error.message),
  });
}
