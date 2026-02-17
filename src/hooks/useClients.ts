import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

export interface Client {
  id: number;
  name: string;
  legal_form?: string | null;
  contract_signer_full_name?: string | null;
  contract_signer_role?: string | null;
  contract_signer_basis?: string | null;
  bin_iin?: string | null;
  city?: string | null;
  legal_address?: string | null;
  address?: string | null;
  tax_regime?: string | null;
  created_by_user?: string | null;
  initial_contact_user?: string | null;
}

export type ClientInsert = Omit<Client, "id">;
export type ClientUpdate = Partial<ClientInsert>;

export interface ClientFilters {
  name?: string;
  bin_iin?: string;
  address?: string;
}

export function useClients(filters?: ClientFilters) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.name) params.set("name", filters.name);
      if (filters?.bin_iin) params.set("bin_iin", filters.bin_iin);
      if (filters?.address) params.set("address", filters.address);
      const query = params.toString();
      return apiFetch<Client[]>(`/api/v1/customers/${query ? `?${query}` : ""}`);
    },
  });
}

export function useClient(id?: number) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Customer id is required");
      }
      return apiFetch<Client>(`/api/v1/customers/${id}`);
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: ClientInsert) => {
      return apiFetch<Client>("/api/v1/customers/", {
        method: "POST",
        body: JSON.stringify(client),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create client: " + error.message);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch<void>(`/api/v1/customers/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete client: " + error.message);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & ClientUpdate) => {
      return apiFetch<Client>(`/api/v1/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update client: " + error.message);
    },
  });
}
