import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface Product {
  id: number;
  supplier_id: number;
  name: string;
  unit: string;
  price: number;
  customs_cleared: boolean;
}

export interface ProductFilters {
  name?: string;
  supplier_id?: number;
}

export interface ProductCreate {
  supplier_id: number;
  name: string;
  unit: string;
  price: number;
  customs_cleared: boolean;
  quantity_available: number;
}

export type ProductUpdate = Partial<Omit<ProductCreate, "supplier_id">> & { supplier_id?: number };

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.name) params.set("name", filters.name);
      if (filters?.supplier_id) params.set("supplier_id", String(filters.supplier_id));
      const query = params.toString();
      return apiFetch<Product[]>(`/api/v1/products${query ? `?${query}` : ""}`);
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProductCreate) => {
      return apiFetch<Product>("/api/v1/products/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & ProductUpdate) => {
      return apiFetch<Product>(`/api/v1/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
