import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface Realization {
  id: number;
  document: string | null;
  realization_date: string | null;
  date_raw: string | null;
  year: number | null;
  year_month: string | null;
  counterparty: string | null;
  contract_ref: string | null;
  bin_iin: string | null;
  nomenclature: string | null;
  product_name: string | null;
  category: string | null;
  active_substance: string | null;
  unit: string | null;
  quantity: number | null;
  price: number | null;
  amount_with_vat: number | null;
  vat_amount: number | null;
  vat_rate: number | null;
  confidence: number | null;
}

export interface RealizationList {
  total: number;
  items: Realization[];
}

export interface MonthPoint {
  year_month: string;
  amount: number;
  count: number;
}

export interface CategoryPoint {
  category: string;
  amount: number;
  quantity: number;
  count: number;
}

export interface ProductPoint {
  product_name: string;
  category: string | null;
  amount: number;
  quantity: number;
  count: number;
}

export interface CounterpartyPoint {
  counterparty: string;
  amount: number;
  count: number;
}

export interface RegionPoint {
  region: string;
  amount: number;
  count: number;
}

export interface RealizationAnalytics {
  total_amount: number;
  total_vat: number;
  total_quantity: number;
  line_items: number;
  documents: number;
  counterparties: number;
  products: number;
  date_from: string | null;
  date_to: string | null;
  years: number[];
  by_month: MonthPoint[];
  by_category: CategoryPoint[];
  by_region: RegionPoint[];
  top_products: ProductPoint[];
  top_counterparties: CounterpartyPoint[];
}

export interface RealizationFilters {
  counterparty?: string;
  product?: string;
  category?: string;
  year?: number;
  year_month?: string;
  limit?: number;
  offset?: number;
}

export function useRealizationsAnalytics(year?: number, top = 10) {
  return useQuery({
    queryKey: ["realizations", "analytics", year ?? "all", top],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.set("year", String(year));
      params.set("top", String(top));
      return apiFetch<RealizationAnalytics>(`/api/v1/realizations/analytics?${params.toString()}`);
    },
  });
}

export function useRealizations(filters: RealizationFilters = {}) {
  return useQuery({
    queryKey: ["realizations", "list", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.counterparty) params.set("counterparty", filters.counterparty);
      if (filters.product) params.set("product", filters.product);
      if (filters.category) params.set("category", filters.category);
      if (filters.year) params.set("year", String(filters.year));
      if (filters.year_month) params.set("year_month", filters.year_month);
      params.set("limit", String(filters.limit ?? 50));
      params.set("offset", String(filters.offset ?? 0));
      return apiFetch<RealizationList>(`/api/v1/realizations/?${params.toString()}`);
    },
  });
}

export interface PaymentSummary {
  year: number | null;
  total_realizations: number;
  paid: number;
  unpaid: number;
  years: number[];
}

export function useRealizationsPaymentSummary(year?: number) {
  return useQuery({
    queryKey: ["realizations", "payment-summary", year ?? "all"],
    queryFn: async () => {
      const q = year ? `?year=${year}` : "";
      return apiFetch<PaymentSummary>(`/api/v1/realizations/payment-summary${q}`);
    },
  });
}
