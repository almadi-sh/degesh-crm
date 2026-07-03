import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface WarehouseStockItem {
  id: number;
  warehouse: string;
  product_name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
}

export interface WarehouseStockList {
  total: number;
  items: WarehouseStockItem[];
}

export interface WarehouseSummaryItem {
  warehouse: string;
  item_count: number;
  positions_with_qty: number;
}

export interface WarehouseStockSummary {
  total_items: number;
  distinct_products: number;
  warehouses: WarehouseSummaryItem[];
}

export function useWarehouseStock() {
  return useQuery({
    queryKey: ["warehouse-stock", "list"],
    queryFn: async () => apiFetch<WarehouseStockList>("/api/v1/warehouse-stock/"),
  });
}

export function useWarehouseSummary() {
  return useQuery({
    queryKey: ["warehouse-stock", "summary"],
    queryFn: async () => apiFetch<WarehouseStockSummary>("/api/v1/warehouse-stock/summary"),
  });
}
