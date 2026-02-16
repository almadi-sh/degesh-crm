import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

export interface PaymentTerm {
  id: number;
  contract_item_id: number;
  percent: number;
  amount: number;
  due_date: string;
}

export interface PaymentTermInsert {
  contract_item_id: number;
  percent: number;
  due_date: string;
}

export interface PaymentTermUpdate {
  percent: number;
  due_date: string;
}

export function useCreatePaymentTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PaymentTermInsert) => {
      return apiFetch<PaymentTerm>("/api/v1/payment-terms/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-items"] });
      toast.success("Payment term created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create payment term: " + error.message);
    },
  });
}

export function useUpdatePaymentTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number } & PaymentTermUpdate) => {
      return apiFetch<PaymentTerm>(`/api/v1/payment-terms/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-items"] });
      toast.success("Payment term updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update payment term: " + error.message);
    },
  });
}

export function useDeletePaymentTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch<void>(`/api/v1/payment-terms/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-items"] });
      toast.success("Payment term deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete payment term: " + error.message);
    },
  });
}
