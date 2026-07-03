import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface ContractListItem {
  id: number;
  number: string | null;
  date: string | null;
  buyer_name: string | null;
  contract_total: number | null;
  currency: string | null;
  appendix_count: number;
  status: string;
  payment_status: string;
  paid_amount: number | null;
  unpaid_amount: number | null;
  cancelled: boolean;
  has_file: boolean;
}

export interface ShipmentOut {
  id: number;
  warehouse: string | null;
  quantity: number;
  shipped_at: string | null;
  note: string | null;
}

export interface AppendixItemOut {
  id: number;
  name: string | null;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total: number | null;
  delivery_date: string | null;
  shipped: number;
  remaining: number;
  status: string;
  shipments: ShipmentOut[];
}

export interface PaymentInstallment {
  percent?: number | null;
  amount?: number | null;
  date?: string | null;
  condition?: string | null;
}

export interface AppendixOut {
  id: number;
  appendix_number: string | null;
  appendix_date: string | null;
  source_file: string | null;
  stated_total: number | null;
  payment_schedule: PaymentInstallment[];
  delivery_terms: string | null;
  status: string;
  items: AppendixItemOut[];
}

export interface ContractDetail {
  id: number;
  folder_name: string | null;
  number: string | null;
  date: string | null;
  buyer_name: string | null;
  supplier_name: string | null;
  contract_total: number | null;
  currency: string | null;
  client_bin: string | null;
  manager: string | null;
  cancelled: boolean;
  summary_for_manager: string | null;
  status: string;
  payment_status: string;
  paid_amount: number | null;
  unpaid_amount: number | null;
  appendix_count: number;
  has_file: boolean;
  appendices: AppendixOut[];
}

export function contractDownloadUrl(id: number) {
  return `${API_BASE_URL}/api/v1/ext-contracts/${id}/download`;
}

export function useClientContracts(bin?: string) {
  return useQuery({
    queryKey: ["client-contracts", bin],
    queryFn: async () => apiFetch<ContractListItem[]>(`/api/v1/ext-contracts/by-client/${bin}`),
    enabled: !!bin,
  });
}

export function useContractDetail(id?: number) {
  return useQuery({
    queryKey: ["contract-detail", id],
    queryFn: async () => apiFetch<ContractDetail>(`/api/v1/ext-contracts/${id}`),
    enabled: !!id,
  });
}

export function useShipItem(contractId?: number, bin?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { itemId: number; warehouse: string; quantity: number; note?: string }) =>
      apiFetch<AppendixItemOut>(`/api/v1/ext-contracts/items/${payload.itemId}/ship`, {
        method: "POST",
        body: JSON.stringify({ warehouse: payload.warehouse, quantity: payload.quantity, note: payload.note }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-detail", contractId] });
      qc.invalidateQueries({ queryKey: ["client-contracts", bin] });
      toast.success("Отгрузка записана");
    },
    onError: (e) => toast.error("Ошибка отгрузки: " + (e as Error).message),
  });
}

export function useDeleteShipment(contractId?: number, bin?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shipmentId: number) =>
      apiFetch<AppendixItemOut>(`/api/v1/ext-contracts/shipments/${shipmentId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract-detail", contractId] });
      qc.invalidateQueries({ queryKey: ["client-contracts", bin] });
      toast.success("Отгрузка отменена");
    },
    onError: (e) => toast.error("Ошибка: " + (e as Error).message),
  });
}
