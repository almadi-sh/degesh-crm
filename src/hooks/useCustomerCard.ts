import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface ClientListItem {
  bin_iin: string;
  name: string | null;
  total_debt: number;
  realization_total: number;
}

export interface ClientProfile {
  bin_iin: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  region: string | null;
}

export interface CardDebtLine {
  contract_name: string | null;
  turnover_debit: number | null;
  turnover_credit: number | null;
  debt_amount: number | null;
  report_date: string | null;
}

export interface CardPurchaseLine {
  date: string | null;
  contract_ref: string | null;
  product_name: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  amount: number | null;
}

export interface CardCategory {
  category: string;
  amount: number;
  quantity: number;
}

export interface CardProduct {
  product_name: string;
  amount: number;
  quantity: number;
  count: number;
}

export interface ClientCard {
  profile: ClientProfile;
  total_debt: number;
  realization_total: number;
  purchase_lines: number;
  product_count: number;
  first_purchase: string | null;
  last_purchase: string | null;
  debts: CardDebtLine[];
  purchases: CardPurchaseLine[];
  categories: CardCategory[];
  top_products: CardProduct[];
}

export interface AiSummary {
  summary: string;
  source: string;
}

export function useCardClients() {
  return useQuery({
    queryKey: ["card-clients"],
    queryFn: async () => apiFetch<ClientListItem[]>("/api/v1/counterparties/"),
  });
}

export function useClientCard(bin?: string) {
  return useQuery({
    queryKey: ["client-card", bin],
    queryFn: async () => apiFetch<ClientCard>(`/api/v1/counterparties/${bin}/card`),
    enabled: !!bin,
  });
}

export function useClientAiSummary(bin?: string) {
  return useQuery({
    queryKey: ["client-ai-summary", bin],
    queryFn: async () =>
      apiFetch<AiSummary>(`/api/v1/counterparties/${bin}/ai-summary`, { method: "POST" }),
    enabled: !!bin,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    retry: false,
  });
}
