import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface DebtContractLine {
  contract_name: string | null;
  debt_amount: number;
}

export interface Debtor {
  bin_iin: string | null;
  company_name: string | null;
  phone: string | null;
  address: string | null;
  total_debt: number;
  contract_count: number;
  contracts: DebtContractLine[];
  realization_total: number;
  realization_last_date: string | null;
  top_product: string | null;
  is_active_buyer: boolean;
  priority: string;
  priority_rank: number;
}

export interface DebtorList {
  report_date: string | null;
  total: number;
  items: Debtor[];
}

export interface DebtBucket {
  label: string;
  count: number;
  amount: number;
}

export interface TopDebtor {
  company_name: string;
  bin_iin: string | null;
  total_debt: number;
  phone: string | null;
}

export interface DebtSummary {
  report_date: string | null;
  total_debt: number;
  debtor_count: number;
  contract_lines: number;
  average_debt: number;
  max_debt: number;
  top10_share: number;
  with_phone: number;
  active_buyers: number;
  high_priority: number;
  buckets: DebtBucket[];
  top_debtors: TopDebtor[];
}

export function useDebtSummary() {
  return useQuery({
    queryKey: ["debts", "summary"],
    queryFn: async () => apiFetch<DebtSummary>("/api/v1/debts/summary"),
  });
}

export function useDebtors() {
  return useQuery({
    queryKey: ["debts", "debtors"],
    queryFn: async () => apiFetch<DebtorList>("/api/v1/debts/debtors"),
  });
}

export interface DueInstallment {
  date: string | null;
  percent: number | null;
  amount: number | null;
}

export interface DebtObligation {
  contract_name: string | null;
  debt_amount: number;
  report_date: string | null;
  contract_id: number | null;
  contract_number: string | null;
  contract_date: string | null;
  due_schedule: DueInstallment[];
}

export interface DebtorDetail {
  bin_iin: string | null;
  company_name: string | null;
  total_debt: number;
  report_date: string | null;
  obligations: DebtObligation[];
}

export function useDebtorDetail(bin?: string, enabled = false) {
  return useQuery({
    queryKey: ["debtor-detail", bin],
    queryFn: async () => apiFetch<DebtorDetail>(`/api/v1/debts/debtor/${bin}`),
    enabled: enabled && !!bin,
    staleTime: 1000 * 60 * 5,
  });
}
