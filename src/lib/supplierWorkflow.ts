export type CustomsStatus = "not_ready" | "ready";

export interface SupplierItemWorkflowMeta {
  purchaseContractCreated: boolean;
  shippingDocsChecked: boolean;
  customsStatus: CustomsStatus;
  warehouse: string;
}

const ITEM_WORKFLOW_STORAGE_KEY = "supplierItemWorkflowMeta";

const defaultMeta: SupplierItemWorkflowMeta = {
  purchaseContractCreated: false,
  shippingDocsChecked: false,
  customsStatus: "not_ready",
  warehouse: "Алматы",
};

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getSupplierItemWorkflowMap = (): Record<string, SupplierItemWorkflowMeta> => {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, SupplierItemWorkflowMeta>>(window.localStorage.getItem(ITEM_WORKFLOW_STORAGE_KEY), {});
};

export const getSupplierItemWorkflow = (itemId: number): SupplierItemWorkflowMeta => {
  const all = getSupplierItemWorkflowMap();
  return all[String(itemId)] ?? defaultMeta;
};

export const setSupplierItemWorkflow = (itemId: number, payload: Partial<SupplierItemWorkflowMeta>) => {
  if (typeof window === "undefined") return;
  const all = getSupplierItemWorkflowMap();
  const current = all[String(itemId)] ?? defaultMeta;
  all[String(itemId)] = { ...current, ...payload };
  window.localStorage.setItem(ITEM_WORKFLOW_STORAGE_KEY, JSON.stringify(all));
};
