import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useClients, useCreateClient, ClientInsert } from "@/hooks/useClients";
import {
  useContracts,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  useResetContractDocument,
  useUpdateContractDocument,
  ContractDocument,
  ContractInsert,
} from "@/hooks/useContracts";
import {
  useContractItems,
  useCreateContractItem,
  useDeleteContractItem,
  useUpdateContractItem,
} from "@/hooks/useContractItems";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { apiFetchResponse } from "@/lib/apiClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Pin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ContractDocumentEditor } from "@/components/contracts/ContractDocumentEditor";
import { DEMO_EMPLOYEES } from "@/lib/employees";
import { KZ_CITIES } from "@/lib/referenceData";
import { setClientCreationMeta } from "@/lib/counterpartyMeta";

interface EditableItem {
  product_id: number;
  quantity: number;
  price: number;
  vat_enabled: boolean;
  delivery_enabled: boolean;
  delivery_terms: string;
}

const VAT_RATE = 0.16;
const NEXT_APPENDIX_KEY = "contractNextAppendix";

const getStoredNextAppendix = (contractId: number): number | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(NEXT_APPENDIX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, number>;
    const value = parsed[String(contractId)];
    return typeof value === "number" && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const setStoredNextAppendix = (contractId: number, nextAppendix: number) => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(NEXT_APPENDIX_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[String(contractId)] = nextAppendix;
    window.localStorage.setItem(NEXT_APPENDIX_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage errors
  }
};

const statusLabels: Record<"Draft" | "Confirmed" | "Sent", string> = {
  Draft: "Черновик",
  Confirmed: "Подтвержден",
  Sent: "Отправлен",
};

const EMPTY_CLIENT: ClientInsert = {
  name: "",
  legal_form: null,
  contract_signer_full_name: null,
  contract_signer_role: null,
  contract_signer_basis: null,
  bin_iin: null,
  city: null,
  legal_address: null,
  address: null,
  tax_regime: null,
  created_by_user: null,
  initial_contact_user: null,
};

export default function ClientCards() {
  const { data: clients = [], isLoading } = useClients();
  const { data: products = [] } = useProducts();
  const { user } = useAuth();
  const createClient = useCreateClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [activeClientId, setActiveClientId] = useState<number | null>(null);
  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false);
  const [newClientData, setNewClientData] = useState<ClientInsert>(EMPTY_CLIENT);

  const managers = useMemo(() => DEMO_EMPLOYEES.filter((employee) => employee.role === "manager"), []);
  const sales = useMemo(() => DEMO_EMPLOYEES.filter((employee) => employee.role === "sales"), []);

  const filtered = useMemo(
    () => clients.filter((item) => [item.name, item.bin_iin, item.city].filter(Boolean).some((v) => v?.toLowerCase().includes(search.toLowerCase()))),
    [clients, search],
  );


  useEffect(() => {
    const clientId = Number(searchParams.get("clientId"));
    if (!Number.isNaN(clientId) && clientId > 0) {
      setActiveClientId(clientId);
    }
  }, [searchParams]);

  const activeClient = useMemo(() => {
    if (activeClientId) {
      return clients.find((item) => item.id === activeClientId) ?? filtered[0] ?? null;
    }
    return filtered[0] ?? null;
  }, [activeClientId, clients, filtered]);

  const { data: contracts = [] } = useContracts(activeClient ? { customer_id: activeClient.id } : undefined);
  const { data: contractItems = [] } = useContractItems(activeClient ? { customer_id: activeClient.id } : undefined);

  const ownedContracts = useMemo(
    () => contracts.filter((contract) => !user?.id || !contract.owner_employee_id || contract.owner_employee_id === user.id),
    [contracts, user?.id],
  );

  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const updateContractDocument = useUpdateContractDocument();
  const resetContractDocument = useResetContractDocument();

  const createContractItem = useCreateContractItem();
  const updateContractItem = useUpdateContractItem();
  const deleteContractItem = useDeleteContractItem();

  const [isCreateContractDialogOpen, setIsCreateContractDialogOpen] = useState(false);
  const [contractFormData, setContractFormData] = useState<ContractInsert>({ customer_id: 0 });

  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [activeContractId, setActiveContractId] = useState<number | null>(null);
  const [draftContractDocument, setDraftContractDocument] = useState<ContractDocument | null>(null);
  const [isContractDocumentDirty, setIsContractDocumentDirty] = useState(false);
  const [contractPreviewPdfUrl, setContractPreviewPdfUrl] = useState<string | null>(null);
  const [isContractPreviewLoading, setIsContractPreviewLoading] = useState(false);
  const previewBlobUrlRef = useRef<string | null>(null);

  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [manageContractId, setManageContractId] = useState<number | null>(null);
  const [activeAppendixNumber, setActiveAppendixNumber] = useState(1);
  const [newItem, setNewItem] = useState<EditableItem>({
    product_id: 0,
    quantity: 1,
    price: Number.NaN,
    vat_enabled: false,
    delivery_enabled: false,
    delivery_terms: "",
  });
  const [editedItems, setEditedItems] = useState<Record<number, EditableItem>>({});

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const contractsById = useMemo(() => new Map(ownedContracts.map((contract) => [contract.id, contract])), [ownedContracts]);

  const itemsByContract = useMemo(() => {
    const map = new Map<number, typeof contractItems>();
    for (const item of contractItems) {
      if (!map.has(item.contract_id)) {
        map.set(item.contract_id, []);
      }
      map.get(item.contract_id)?.push(item);
    }
    return map;
  }, [contractItems]);

  const activeContract = useMemo(
    () => (activeContractId ? ownedContracts.find((contract) => contract.id === activeContractId) : undefined),
    [activeContractId, ownedContracts],
  );

  const activeItems = useMemo(
    () => (activeContractId ? contractItems.filter((item) => item.contract_id === activeContractId) : []),
    [activeContractId, contractItems],
  );

  const manageItems = useMemo(() => (manageContractId ? itemsByContract.get(manageContractId) ?? [] : []), [manageContractId, itemsByContract]);

  const appendixNumbers = useMemo(() => {
    const numbers = new Set<number>();
    for (const item of manageItems) {
      numbers.add(item.appendix_number || 1);
    }
    numbers.add(activeAppendixNumber);
    if (numbers.size === 0) numbers.add(1);
    return Array.from(numbers).sort((a, b) => a - b);
  }, [activeAppendixNumber, manageItems]);

  const itemsByAppendix = useMemo(() => {
    const map = new Map<number, typeof manageItems>();
    for (const appendixNumber of appendixNumbers) {
      map.set(appendixNumber, []);
    }
    for (const item of manageItems) {
      const appendixNumber = item.appendix_number || 1;
      map.set(appendixNumber, [...(map.get(appendixNumber) ?? []), item]);
    }
    return map;
  }, [manageItems, appendixNumbers]);

  useEffect(() => {
    if (activeClient) {
      setContractFormData({ customer_id: activeClient.id });
    }
  }, [activeClient]);

  useEffect(() => {
    if (!manageContractId) {
      setEditedItems({});
      return;
    }
    const nextEdited: Record<number, EditableItem> = {};
    const items = itemsByContract.get(manageContractId) ?? [];
    for (const item of items) {
      nextEdited[item.id] = {
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        vat_enabled: item.vat_enabled ?? false,
        delivery_enabled: item.delivery_enabled,
        delivery_terms: item.delivery_terms ?? "",
      };
    }
    setEditedItems(nextEdited);
  }, [manageContractId, itemsByContract]);

  useEffect(() => {
    if (!manageContractId) return;
    const maxAppendix = manageItems.reduce((maxValue, item) => {
      const appendixNumber = item.appendix_number || 1;
      return Math.max(maxValue, appendixNumber);
    }, 0);
    const storedNextAppendix = getStoredNextAppendix(manageContractId);
    const defaultAppendix = maxAppendix > 0 ? maxAppendix : 1;
    setActiveAppendixNumber(storedNextAppendix ?? defaultAppendix);
  }, [manageContractId, manageItems]);

  const handleDocumentChange = useCallback((document: ContractDocument, isDirty: boolean) => {
    setDraftContractDocument(document);
    setIsContractDocumentDirty(isDirty);
  }, []);

  const closeContractDialog = () => {
    if (previewBlobUrlRef.current) {
      window.URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
    setContractPreviewPdfUrl(null);
    setIsContractDialogOpen(false);
    setActiveContractId(null);
    setDraftContractDocument(null);
    setIsContractDocumentDirty(false);
  };

  const refreshContractPreview = useCallback(async () => {
    if (!activeContract || activeContract.status !== "Confirmed") {
      setContractPreviewPdfUrl(null);
      return;
    }

    setIsContractPreviewLoading(true);
    try {
      const body = draftContractDocument ? JSON.stringify({ contract_document: draftContractDocument }) : undefined;
      const response = await apiFetchResponse(`/api/v1/contracts/${activeContract.id}/document/preview-pdf?ts=${Date.now()}`, {
        method: "POST",
        cache: "no-store",
        body,
      });
      const blob = await response.blob();
      const nextUrl = window.URL.createObjectURL(blob);
      if (previewBlobUrlRef.current) {
        window.URL.revokeObjectURL(previewBlobUrlRef.current);
      }
      previewBlobUrlRef.current = nextUrl;
      setContractPreviewPdfUrl(nextUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить предпросмотр PDF";
      toast.error(message);
    } finally {
      setIsContractPreviewLoading(false);
    }
  }, [activeContract, draftContractDocument]);

  useEffect(() => {
    if (!isContractDialogOpen) return;
    const timeoutId = window.setTimeout(() => {
      void refreshContractPreview();
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [isContractDialogOpen, refreshContractPreview]);

  useEffect(() => {
    return () => {
      if (previewBlobUrlRef.current) {
        window.URL.revokeObjectURL(previewBlobUrlRef.current);
      }
    };
  }, []);

  const handleDownloadContract = async () => {
    if (!activeContract) return;
    try {
      if (isContractDocumentDirty && draftContractDocument) {
        await updateContractDocument.mutateAsync({
          id: activeContract.id,
          contract_document: draftContractDocument,
        });
        setIsContractDocumentDirty(false);
      }

      const response = await apiFetchResponse(`/api/v1/contracts/${activeContract.id}/document/export-pdf?ts=${Date.now()}`, { cache: "no-store" });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameStarMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const filenameMatch = disposition.match(/filename=([^;]+)/i);
      const fallbackFilename = `contract-${activeContract.contract_number}.pdf`;
      const filename = filenameStarMatch?.[1]
        ? decodeURIComponent(filenameStarMatch[1].trim().replace(/^"|"$/g, ""))
        : filenameMatch?.[1]?.trim().replace(/^"|"$/g, "") || fallbackFilename;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Договор скачан");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось скачать договор";
      toast.error(message);
    }
  };

  const handleResetContractDocument = async () => {
    if (!activeContract) return;
    if (!window.confirm("Сбросить текст договора к шаблону по умолчанию?")) return;

    await resetContractDocument.mutateAsync({ id: activeContract.id });
    setDraftContractDocument(null);
    setIsContractDocumentDirty(false);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    await createContract.mutateAsync({
      ...contractFormData,
      customer_id: Number(contractFormData.customer_id),
      owner_employee_id: user?.id ?? null,
    });
    setIsCreateContractDialogOpen(false);
  };

  const openContractDialog = (contractId: number) => {
    setActiveContractId(contractId);
    setIsContractDialogOpen(true);
  };

  const handleStatusChange = async (id: number, status: "Draft" | "Confirmed" | "Sent") => {
    await updateContract.mutateAsync({ id, status });
  };

  const handleDeleteContract = async (id: number) => {
    if (!window.confirm("Удалить этот договор? Все позиции договора тоже будут удалены.")) return;
    await deleteContract.mutateAsync(id);
  };

  const openManageDialog = (contractId: number, appendixNumber?: number) => {
    setManageContractId(contractId);
    if (appendixNumber) {
      setActiveAppendixNumber(appendixNumber);
    }
    setIsManageDialogOpen(true);
  };

  const closeManageDialog = () => {
    setIsManageDialogOpen(false);
    setManageContractId(null);
    setActiveAppendixNumber(1);
    setNewItem({
      product_id: 0,
      quantity: 1,
      price: Number.NaN,
      vat_enabled: false,
      delivery_enabled: false,
      delivery_terms: "",
    });
  };

  const handleAddItem = async () => {
    if (!manageContractId || !newItem.product_id || Number.isNaN(newItem.price)) return;
    await createContractItem.mutateAsync({
      contract_id: manageContractId,
      product_id: newItem.product_id,
      quantity: newItem.quantity,
      price: newItem.price,
      vat_enabled: newItem.vat_enabled,
      delivery_enabled: newItem.delivery_enabled,
      delivery_terms: newItem.delivery_enabled ? newItem.delivery_terms : null,
      appendix_number: activeAppendixNumber,
    });
    setNewItem({
      product_id: 0,
      quantity: 1,
      price: Number.NaN,
      vat_enabled: false,
      delivery_enabled: false,
      delivery_terms: "",
    });
  };

  const handleUpdateItem = async (id: number) => {
    const payload = editedItems[id];
    if (!payload) return;
    await updateContractItem.mutateAsync({
      id,
      product_id: payload.product_id,
      quantity: payload.quantity,
      price: payload.price,
      vat_enabled: payload.vat_enabled,
      delivery_enabled: payload.delivery_enabled,
      delivery_terms: payload.delivery_enabled ? payload.delivery_terms : null,
    });
  };

  const handlePinAndSaveAppendix = async (appendixNumber: number) => {
    const appendixItems = itemsByAppendix.get(appendixNumber) ?? [];

    for (const item of appendixItems) {
      const payload = editedItems[item.id];
      if (!payload) continue;
      await updateContractItem.mutateAsync({
        id: item.id,
        product_id: payload.product_id,
        quantity: payload.quantity,
        price: payload.price,
        vat_enabled: payload.vat_enabled,
        delivery_enabled: payload.delivery_enabled,
        delivery_terms: payload.delivery_enabled ? payload.delivery_terms : null,
      });
    }

    const nextAppendix = appendixNumber + 1;
    setActiveAppendixNumber(nextAppendix);
    if (manageContractId) {
      setStoredNextAppendix(manageContractId, nextAppendix);
    }
    toast.success(`Приложение ${appendixNumber} закреплено. Добавление продолжится в Приложение ${nextAppendix}.`);
  };

  const handleDownloadAppendix = async (appendixNumber: number) => {
    if (!manageContractId) return;
    try {
      const response = await apiFetchResponse(`/api/v1/contract-items/contract/${manageContractId}/appendix/${appendixNumber}/export-xlsx`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `appendix-${appendixNumber}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось скачать приложение";
      toast.error(message);
    }
  };

  const updateEditedItem = (id: number, field: keyof EditableItem, value: number | boolean | string) => {
    setEditedItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleCreateClient = async (event: React.FormEvent) => {
    event.preventDefault();
    const creatorName = user?.name ?? newClientData.created_by_user ?? "Неизвестный аккаунт";
    const created = await createClient.mutateAsync({
      ...newClientData,
      created_by_user: creatorName,
    });
    setClientCreationMeta(created.id, creatorName);
    setIsCreateClientDialogOpen(false);
    setNewClientData(EMPTY_CLIENT);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">Покупатели</h1>
            <p className="text-muted-foreground mt-1">Раздел объединяет список покупателей и карточки клиентов с договорами.</p>
          </div>
          <Dialog open={isCreateClientDialogOpen} onOpenChange={setIsCreateClientDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Добавить покупателя
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Добавить нового покупателя</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateClient} className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Наименование клиента *</Label>
                    <Input value={newClientData.name} onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Форма лица</Label>
                    <Select value={newClientData.legal_form ?? ""} onValueChange={(value) => setNewClientData({ ...newClientData, legal_form: value })}>
                      <SelectTrigger><SelectValue placeholder="КХ / ТОО / ИП / ФХ" /></SelectTrigger>
                      <SelectContent>{["КХ", "ТОО", "ИП", "ФХ"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Лицо на кого оформляется договор (ФИО)</Label>
                    <Input value={newClientData.contract_signer_full_name ?? ""} onChange={(e) => setNewClientData({ ...newClientData, contract_signer_full_name: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Контактное лицо 1 — роль (опционально)</Label>
                    <Input value={newClientData.contract_signer_role ?? ""} onChange={(e) => setNewClientData({ ...newClientData, contract_signer_role: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Контактное лицо 2 — роль (опционально)</Label>
                    <Input value={newClientData.contract_signer_basis ?? ""} onChange={(e) => setNewClientData({ ...newClientData, contract_signer_basis: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>БИН/ИИН (12 цифр)</Label>
                    <Input value={newClientData.bin_iin ?? ""} maxLength={12} onChange={(e) => setNewClientData({ ...newClientData, bin_iin: e.target.value.replace(/\D/g, "") || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Налоговый режим</Label>
                    <Select value={newClientData.tax_regime ?? ""} onValueChange={(value) => setNewClientData({ ...newClientData, tax_regime: value })}>
                      <SelectTrigger><SelectValue placeholder="Общеустановленный / Упрощенный" /></SelectTrigger>
                      <SelectContent>{["Общеустановленный", "Упрощенный"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Город</Label>
                    <Select value={newClientData.city ?? ""} onValueChange={(value) => setNewClientData({ ...newClientData, city: value })}>
                      <SelectTrigger><SelectValue placeholder="Выберите город" /></SelectTrigger>
                      <SelectContent>{KZ_CITIES.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Юр. адрес</Label>
                    <Input value={newClientData.legal_address ?? ""} onChange={(e) => setNewClientData({ ...newClientData, legal_address: e.target.value || null, address: e.target.value || null })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Кто создал в системе</Label>
                    <Select value={newClientData.created_by_user ?? ""} onValueChange={(value) => setNewClientData({ ...newClientData, created_by_user: value })}>
                      <SelectTrigger><SelectValue placeholder="Менеджер" /></SelectTrigger>
                      <SelectContent>{managers.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Кто скоммуницировал изначально</Label>
                    <Select value={newClientData.initial_contact_user ?? ""} onValueChange={(value) => setNewClientData({ ...newClientData, initial_contact_user: value })}>
                      <SelectTrigger><SelectValue placeholder="Продажник" /></SelectTrigger>
                      <SelectContent>{sales.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsCreateClientDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="submit" disabled={createClient.isPending}>
                    {createClient.isPending ? "Создание..." : "Создать покупателя"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Список клиентов</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по клиенту..." />
              <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
                {filtered.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setActiveClientId(client.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${activeClient?.id === client.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.bin_iin ?? "Без BIN/IIN"}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Карточка клиента</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              ) : !activeClient ? (
                <p className="text-sm text-muted-foreground">Клиент не выбран.</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold">{activeClient.name}</h2>
                    <p className="text-sm text-muted-foreground">{activeClient.legal_form ?? "—"} • {activeClient.tax_regime ?? "Налоговый режим не указан"}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div><p className="text-xs text-muted-foreground">БИН/ИИН</p><p className="font-medium">{activeClient.bin_iin ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Город</p><p className="font-medium">{activeClient.city ?? "—"}</p></div>
                    <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Юридический адрес</p><p className="font-medium">{activeClient.legal_address ?? "—"}</p></div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div><p className="text-xs text-muted-foreground">Подписант</p><p className="font-medium">{activeClient.contract_signer_full_name ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Контактное лицо 1 — роль</p><p className="font-medium">{activeClient.contract_signer_role ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Контактное лицо 2 — роль</p><p className="font-medium">{activeClient.contract_signer_basis ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Кто создал</p><p className="font-medium">{activeClient.created_by_user ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Изначально скоммуницировал</p><p className="font-medium">{activeClient.initial_contact_user ?? "—"}</p></div>
                  </div>

                  <Tabs defaultValue="contracts" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="contracts">Сделки / договоры</TabsTrigger>
                      <TabsTrigger value="appendices">Приложения</TabsTrigger>
                      <TabsTrigger value="shipments">Отгрузки</TabsTrigger>
                      <TabsTrigger value="payments">Платежи</TabsTrigger>
                      <TabsTrigger value="history">История изменений</TabsTrigger>
                    </TabsList>

                    <TabsContent value="contracts" className="space-y-3">
                      <div className="flex justify-end">
                        <Dialog open={isCreateContractDialogOpen} onOpenChange={setIsCreateContractDialogOpen}>
                          <DialogTrigger asChild>
                            <Button>Новый договор</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="font-display text-xl">Создать новый договор</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateContract} className="mt-4 space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="customer_id">Покупатель *</Label>
                                <Select value={contractFormData.customer_id ? String(contractFormData.customer_id) : ""} onValueChange={(value) => setContractFormData({ ...contractFormData, customer_id: Number(value) })}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите покупателя" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {clients.map((client) => (
                                      <SelectItem key={client.id} value={String(client.id)}>
                                        {client.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                                <Button type="button" variant="outline" onClick={() => setIsCreateContractDialogOpen(false)}>
                                  Отмена
                                </Button>
                                <Button type="submit" disabled={createContract.isPending || !contractFormData.customer_id}>
                                  {createContract.isPending ? "Создание..." : "Создать договор"}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {ownedContracts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Нет договоров.</p>
                      ) : ownedContracts.map((contract) => (
                        <div key={contract.id} className="space-y-3 rounded-lg border border-border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{contract.contract_number}</p>
                              <p className="text-xs text-muted-foreground">{new Date(contract.contract_date).toLocaleDateString("ru-RU")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={contract.status === "Confirmed" ? "default" : contract.status === "Sent" ? "secondary" : "outline"}>{statusLabels[contract.status]}</Badge>
                              <Select value={contract.status} onValueChange={(value) => handleStatusChange(contract.id, value as "Draft" | "Confirmed" | "Sent")}>
                                <SelectTrigger className="h-8 w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Draft">Черновик</SelectItem>
                                  <SelectItem value="Confirmed">Подтвержден</SelectItem>
                                  <SelectItem value="Sent">Отправлен</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openContractDialog(contract.id)}>Документ</Button>
                            <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteContract(contract.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="appendices" className="space-y-2">
                      {ownedContracts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Сначала создайте договор для клиента.</p>
                      ) : ownedContracts.map((contract) => {
                        const items = itemsByContract.get(contract.id) ?? [];
                        const appendixCount = new Set(items.map((item) => item.appendix_number || 1)).size;
                        const latestAppendix = items.reduce((maxValue, item) => Math.max(maxValue, item.appendix_number || 1), 1);
                        return (
                          <div key={contract.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="font-medium">{contract.contract_number}</p>
                              <p className="text-xs text-muted-foreground">Позиции: {items.length} • Приложений: {appendixCount}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => openManageDialog(contract.id, latestAppendix)}>Редактировать</Button>
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="shipments" className="space-y-2">
                      <div className="rounded-lg border border-dashed border-border p-4">
                        <p className="text-sm font-medium">Отгрузки клиента</p>
                        <p className="text-sm text-muted-foreground mt-1">Раздел подготовлен как задел: здесь будет лента отгрузок по договорам клиента.</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-2">
                      <div className="rounded-lg border border-dashed border-border p-4">
                        <p className="text-sm font-medium">Платежи клиента</p>
                        <p className="text-sm text-muted-foreground mt-1">Раздел подготовлен как задел: здесь появится журнал платежей и сверка оплат.</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-2">
                      <div className="rounded-lg border border-dashed border-border p-4">
                        <p className="text-sm font-medium">История изменений</p>
                        <p className="text-sm text-muted-foreground mt-1">Раздел подготовлен как задел: здесь будет таймлайн изменений по клиенту, сделкам и приложениям.</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog
          open={isContractDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeContractDialog();
            } else {
              setIsContractDialogOpen(true);
            }
          }}
        >
          <DialogContent className="max-w-5xl overflow-hidden p-0">
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="font-display text-xl">Договор {activeContract?.contract_number ?? ""}</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pr-2">
                {activeContract ? (
                  activeContract.status === "Confirmed" ? (
                    <div className="space-y-6">
                      <div className="rounded-lg border border-border p-4 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Обзор договора</h3>
                            <p className="text-sm text-muted-foreground">Покупатель и позиции, включенные в договор.</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => void refreshContractPreview()} disabled={isContractPreviewLoading}>
                              {isContractPreviewLoading ? "Обновление предпросмотра..." : "Обновить PDF-предпросмотр"}
                            </Button>
                            <Button onClick={handleDownloadContract}>Скачать PDF</Button>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Покупатель</p>
                            <p className="font-medium text-foreground">{activeClient?.name ?? "Неизвестно"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">BIN/IIN</p>
                            <p className="font-medium text-foreground">{activeClient?.bin_iin ?? "—"}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground">Адрес</p>
                            <p className="font-medium text-foreground">{activeClient?.legal_address ?? "—"}</p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Товар</TableHead>
                                <TableHead>Кол-во</TableHead>
                                <TableHead>Цена</TableHead>
                                <TableHead>Итого</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeItems.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    Позиции пока не добавлены.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                activeItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{productsById.get(item.product_id)?.name ?? "Неизвестно"}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{item.price.toFixed(2)}</TableCell>
                                    <TableCell>{(item.total_amount ?? item.quantity * item.price).toFixed(2)}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-foreground">Предпросмотр PDF</h3>
                          {isContractPreviewLoading && <span className="text-xs text-muted-foreground">Обновление…</span>}
                        </div>
                        {contractPreviewPdfUrl ? (
                          <iframe title="Предпросмотр PDF договора" src={contractPreviewPdfUrl} className="w-full h-[720px] rounded-md border border-border bg-background" />
                        ) : (
                          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">Предпросмотр PDF недоступен. Нажмите «Обновить предпросмотр», чтобы сформировать файл.</div>
                        )}
                      </div>

                      <ContractDocumentEditor
                        contract={activeContract}
                        customer={activeClient}
                        salesCity={user?.city}
                        isSaving={updateContractDocument.isPending}
                        isResetting={resetContractDocument.isPending}
                        onDocumentChange={handleDocumentChange}
                        onResetToDefault={handleResetContractDocument}
                        onSave={async (document) => {
                          await updateContractDocument.mutateAsync({
                            id: activeContract.id,
                            contract_document: document,
                          });
                          setIsContractDocumentDirty(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Подтвердите договор, чтобы просматривать и скачивать документ.</div>
                  )
                ) : (
                  <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Выберите договор, чтобы открыть его документ.</div>
                )}
              </div>
              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <Button variant="outline" onClick={closeContractDialog}>
                  Закрыть
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isManageDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeManageDialog();
            } else {
              setIsManageDialogOpen(true);
            }
          }}
        >
          <DialogContent className="max-w-5xl overflow-hidden p-0">
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="font-display text-xl">Управление позициями: {manageContractId ? contractsById.get(manageContractId)?.contract_number : ""}</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pr-2">
                <div className="space-y-6">
                  <div className="grid grid-cols-12 gap-3 items-end rounded-lg border border-border p-4">
                    <div className="col-span-4 space-y-2">
                      <Label>Товар *</Label>
                      <Select value={newItem.product_id ? String(newItem.product_id) : ""} onValueChange={(value) => setNewItem({ ...newItem, product_id: Number(value) })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите товар" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name} ({product.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Кол-во</Label>
                      <Input type="number" min="1" step="1" value={newItem.quantity} onChange={(event) => setNewItem({ ...newItem, quantity: Number(event.target.value) })} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Цена</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={Number.isNaN(newItem.price) ? "" : newItem.price}
                        onChange={(event) =>
                          setNewItem({
                            ...newItem,
                            price: event.target.value === "" ? Number.NaN : Number(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Цена (с НДС)</Label>
                      <Input value={(Number.isNaN(newItem.price) ? 0 : newItem.price * (newItem.vat_enabled ? 1 + VAT_RATE : 1)).toFixed(2)} readOnly />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Checkbox checked={newItem.vat_enabled} onCheckedChange={(checked) => setNewItem({ ...newItem, vat_enabled: checked === true })} id="new-item-vat" />
                      <Label htmlFor="new-item-vat">НДС 16%</Label>
                    </div>
                    <div className="col-span-12 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={newItem.delivery_enabled} onCheckedChange={(checked) => setNewItem({ ...newItem, delivery_enabled: Boolean(checked) })} id="delivery-enabled" />
                        <Label htmlFor="delivery-enabled">Есть доставка</Label>
                        {newItem.delivery_enabled && (
                          <Input className="ml-4" value={newItem.delivery_terms} onChange={(event) => setNewItem({ ...newItem, delivery_terms: event.target.value })} placeholder="Условия доставки" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Приложение {activeAppendixNumber}</Badge>
                        <Button onClick={handleAddItem} disabled={!newItem.product_id || Number.isNaN(newItem.price) || createContractItem.isPending}>
                          Добавить позицию
                        </Button>
                      </div>
                    </div>
                  </div>

                  {appendixNumbers.map((appendixNumber) => {
                    const appendixItems = itemsByAppendix.get(appendixNumber) ?? [];
                    const isLockedAppendix = appendixNumber < activeAppendixNumber;
                    return (
                      <div key={appendixNumber} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">Приложение {appendixNumber}</h3>
                            {isLockedAppendix && <Badge variant="secondary">Закреплено</Badge>}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadAppendix(appendixNumber)}>
                            Скачать XLSX
                          </Button>
                        </div>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Товар</TableHead>
                                <TableHead>Кол-во</TableHead>
                                <TableHead>Цена (без НДС)</TableHead>
                                <TableHead>Цена (с НДС)</TableHead>
                                <TableHead>НДС</TableHead>
                                <TableHead>Доставка</TableHead>
                                <TableHead className="w-[160px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {appendixItems.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    В этом приложении пока нет позиций.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                appendixItems.map((item) => {
                                  const edited = editedItems[item.id];
                                  if (!edited) return null;
                                  return (
                                    <TableRow key={item.id} className="hover:bg-muted/50">
                                      <TableCell>
                                        <Select disabled={isLockedAppendix} value={edited.product_id ? String(edited.product_id) : ""} onValueChange={(value) => updateEditedItem(item.id, "product_id", Number(value))}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Выберите товар" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {products.map((product) => (
                                              <SelectItem key={product.id} value={String(product.id)}>
                                                {product.name} ({product.unit})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell>
                                        <Input type="number" min="1" step="1" value={edited.quantity} onChange={(event) => updateEditedItem(item.id, "quantity", Number(event.target.value))} disabled={isLockedAppendix} />
                                      </TableCell>
                                      <TableCell>
                                        <Input type="number" min="0" step="0.01" value={edited.price} onChange={(event) => updateEditedItem(item.id, "price", Number(event.target.value))} disabled={isLockedAppendix} />
                                      </TableCell>
                                      <TableCell>
                                        <Input value={(edited.price * (edited.vat_enabled ? 1 + VAT_RATE : 1)).toFixed(2)} readOnly disabled={isLockedAppendix} />
                                      </TableCell>
                                      <TableCell>
                                        <Checkbox checked={edited.vat_enabled} onCheckedChange={(checked) => updateEditedItem(item.id, "vat_enabled", checked === true)} disabled={isLockedAppendix} />
                                      </TableCell>
                                      <TableCell>
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <Checkbox checked={edited.delivery_enabled} onCheckedChange={(checked) => updateEditedItem(item.id, "delivery_enabled", checked === true)} id={`item-delivery-${item.id}`} disabled={isLockedAppendix} />
                                            <Label htmlFor={`item-delivery-${item.id}`}>Доставка</Label>
                                          </div>
                                          {edited.delivery_enabled && (
                                            <Input value={edited.delivery_terms} onChange={(event) => updateEditedItem(item.id, "delivery_terms", event.target.value)} placeholder="Условия доставки" disabled={isLockedAppendix} />
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex justify-end gap-2">
                                          <Button size="sm" onClick={() => handleUpdateItem(item.id)} disabled={updateContractItem.isPending || isLockedAppendix}>
                                            Сохранить
                                          </Button>
                                          <Button variant="outline" size="icon" onClick={() => deleteContractItem.mutate(item.id)} disabled={deleteContractItem.isPending || isLockedAppendix}>
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        {appendixNumber === activeAppendixNumber && (
                          <div className="flex justify-end">
                            <Button variant="outline" onClick={() => void handlePinAndSaveAppendix(appendixNumber)} disabled={updateContractItem.isPending || appendixItems.length === 0}>
                              <Pin className="mr-2 h-4 w-4" /> Закрепить и сохранить приложение
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                <Button variant="outline" onClick={closeManageDialog}>
                  Закрыть
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
