import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface Product {
  id: number;
  name: string;
  unit: string;
  price: number;
}

export interface ProductFilters {
  name?: string;
}

export type ProductUpdate = Partial<Omit<Product, "id">>;

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.name) params.set("name", filters.name);
      const query = params.toString();
      return apiFetch<Product[]>(`/api/v1/products/${query ? `?${query}` : ""}`);
    },
  });
}

export function useProduct(id?: number) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Product id is required");
      }
      return apiFetch<Product>(`/api/v1/products/${id}`);
    },
    enabled: !!id,
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
    },
  });
}
