import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

export interface Lead {
  bin_iin: string | null;
  company_name: string | null;
  phone: string | null;
  lead_type: string;
  category: string;
  suggested_product: string | null;
  reason: string;
  potential: number;
  total_bought: number;
  last_purchase: string | null;
}

export interface LeadTypeStat {
  lead_type: string;
  count: number;
  potential: number;
}

export interface LeadsResponse {
  total_leads: number;
  total_potential: number;
  buyers_analyzed: number;
  season_label: string | null;
  by_type: LeadTypeStat[];
  items: Lead[];
}

export interface LeadFilters {
  lead_type?: string;
  search?: string;
  limit?: number;
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.lead_type) params.set("lead_type", filters.lead_type);
      if (filters.search) params.set("search", filters.search);
      params.set("limit", String(filters.limit ?? 500));
      const q = params.toString();
      return apiFetch<LeadsResponse>(`/api/v1/leads/${q ? `?${q}` : ""}`);
    },
  });
}

export interface LeadEvidenceItem {
  product: string | null;
  quantity: number | null;
  unit: string | null;
  amount: number;
  year: number | null;
  month: number | null;
  last_date: string | null;
}

export interface LeadSeason {
  year: number | null;
  amount: number;
  items: LeadEvidenceItem[];
}

export interface LeadRelatedAppendix {
  contract_id: number;
  contract_number: string | null;
  contract_date: string | null;
  appendix_number: string | null;
  appendix_date: string | null;
  item_name: string | null;
  quantity: number | null;
  unit: string | null;
  amount: number | null;
}

export interface LeadDetail {
  bin_iin: string | null;
  company_name: string | null;
  category: string | null;
  lead_type: string | null;
  suggested_product: string | null;
  season_label: string | null;
  current_year: number | null;
  seasons: LeadSeason[];
  current_season: LeadSeason | null;
  related_appendices: LeadRelatedAppendix[];
  narrative: string;
  narrative_source: string;
}

export function useLeadDetail(lead: Lead | null, enabled: boolean) {
  return useQuery({
    queryKey: ["lead-detail", lead?.bin_iin, lead?.lead_type, lead?.category, lead?.suggested_product],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("bin_iin", lead?.bin_iin ?? "");
      if (lead?.category) params.set("category", lead.category);
      if (lead?.lead_type) params.set("lead_type", lead.lead_type);
      if (lead?.suggested_product) params.set("product", lead.suggested_product);
      return apiFetch<LeadDetail>(`/api/v1/leads/detail?${params.toString()}`);
    },
    enabled: enabled && !!lead?.bin_iin,
    staleTime: 1000 * 60 * 5,
  });
}
