import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useClients } from "@/hooks/useClients";
import { useContracts } from "@/hooks/useContracts";
import { useProducts } from "@/hooks/useProducts";
import {
  useContractItems,
  useCreateContractItem,
  useDeleteContractItem,
  useUpdateContractItem,
} from "@/hooks/useContractItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Pin, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetchResponse } from "@/lib/apiClient";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

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

export default function ContractItems() {
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const { data: contracts = [] } = useContracts(selectedCustomer ? { customer_id: selectedCustomer } : undefined);
  const { data: contractItems = [] } = useContractItems(selectedCustomer ? { customer_id: selectedCustomer } : undefined);
  const createContractItem = useCreateContractItem();
  const updateContractItem = useUpdateContractItem();
  const deleteContractItem = useDeleteContractItem();

  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [activeContractId, setActiveContractId] = useState<number | null>(null);
  const [activeAppendixNumber, setActiveAppendixNumber] = useState(1);
  const [newItem, setNewItem] = useState<EditableItem>({
    product_id: 0,
    quantity: 1,
    price: 0,
    vat_enabled: false,
    delivery_enabled: false,
    delivery_terms: "",
  });
  const [editedItems, setEditedItems] = useState<Record<number, EditableItem>>({});
  const ownedContracts = useMemo(
    () => contracts.filter((contract) => !user?.id || !contract.owner_employee_id || contract.owner_employee_id === user.id),
    [contracts, user?.id],
  );
  const ownedContractIds = useMemo(() => new Set(ownedContracts.map((contract) => contract.id)), [ownedContracts]);
  const ownedContractItems = useMemo(() => contractItems.filter((item) => ownedContractIds.has(item.contract_id)), [contractItems, ownedContractIds]);

  const customersById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const contractsById = useMemo(() => new Map(ownedContracts.map((contract) => [contract.id, contract])), [ownedContracts]);

  const itemsByContract = useMemo(() => {
    const map = new Map<number, typeof ownedContractItems>();
    for (const item of ownedContractItems) {
      if (!map.has(item.contract_id)) {
        map.set(item.contract_id, []);
      }
      map.get(item.contract_id)?.push(item);
    }
    return map;
  }, [ownedContractItems]);

  const activeItems = useMemo(() => (activeContractId ? itemsByContract.get(activeContractId) ?? [] : []), [activeContractId, itemsByContract]);

  const appendixNumbers = useMemo(() => {
    const numbers = new Set<number>();
    for (const item of activeItems) {
      numbers.add(item.appendix_number || 1);
    }
    numbers.add(activeAppendixNumber);
    if (numbers.size === 0) numbers.add(1);
    return Array.from(numbers).sort((a, b) => a - b);
  }, [activeAppendixNumber, activeItems]);

  const itemsByAppendix = useMemo(() => {
    const map = new Map<number, typeof activeItems>();
    for (const appendixNumber of appendixNumbers) {
      map.set(appendixNumber, []);
    }
    for (const item of activeItems) {
      const appendixNumber = item.appendix_number || 1;
      map.set(appendixNumber, [...(map.get(appendixNumber) ?? []), item]);
    }
    return map;
  }, [activeItems, appendixNumbers]);

  const contractSummaries = useMemo(() => {
    return ownedContracts.map((contract) => {
      const items = itemsByContract.get(contract.id) ?? [];
      const totalWithoutVat = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const totalWithVat = items.reduce(
        (sum, item) => sum + (item.total_amount ?? item.quantity * item.price * (item.vat_enabled ? 1 + VAT_RATE : 1)),
        0,
      );
      const deliveryEnabled = items.some((item) => item.delivery_enabled);
      return { contract, items, totalWithoutVat, totalWithVat, deliveryEnabled };
    });
  }, [ownedContracts, itemsByContract]);

  useEffect(() => {
    if (!activeContractId) {
      setEditedItems({});
      return;
    }
    const nextEdited: Record<number, EditableItem> = {};
    const items = itemsByContract.get(activeContractId) ?? [];
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
  }, [activeContractId, itemsByContract]);

  useEffect(() => {
    if (!activeContractId) return;
    const maxAppendix = activeItems.reduce((maxValue, item) => {
      const appendixNumber = item.appendix_number || 1;
      return Math.max(maxValue, appendixNumber);
    }, 0);
    const storedNextAppendix = getStoredNextAppendix(activeContractId);
    const defaultAppendix = maxAppendix > 0 ? maxAppendix : 1;
    setActiveAppendixNumber(storedNextAppendix ?? defaultAppendix);
  }, [activeContractId, activeItems]);


  useEffect(() => {
    const contractIdParam = Number(searchParams.get("contractId") ?? 0);
    const appendixParam = Number(searchParams.get("appendixNumber") ?? 0);
    if (!contractIdParam) return;
    setActiveContractId(contractIdParam);
    setActiveAppendixNumber(appendixParam > 0 ? appendixParam : 1);
    setIsManageDialogOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);
  const openManageDialog = (contractId: number) => {
    setActiveContractId(contractId);
    setIsManageDialogOpen(true);
  };

  const closeManageDialog = () => {
    setIsManageDialogOpen(false);
    setActiveContractId(null);
    setActiveAppendixNumber(1);
    setNewItem({
      product_id: 0,
      quantity: 1,
      price: 0,
      vat_enabled: false,
      delivery_enabled: false,
      delivery_terms: "",
    });
  };

  const handleAddItem = async () => {
    if (!activeContractId || !newItem.product_id) return;
    await createContractItem.mutateAsync({
      contract_id: activeContractId,
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
      price: 0,
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
    if (activeContractId) {
      setStoredNextAppendix(activeContractId, nextAppendix);
    }
    toast.success(`Приложение ${appendixNumber} закреплено. Добавление продолжится в Приложение ${nextAppendix}.`);
  };

  const handleDownloadAppendix = async (appendixNumber: number) => {
    if (!activeContractId) return;
    try {
      const response = await apiFetchResponse(`/api/v1/contract-items/contract/${activeContractId}/appendix/${appendixNumber}/export-xlsx`);
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">Приложения к договорам</h1>
            <p className="text-muted-foreground mt-1">Проверка сумм по договорам и управление товарами в приложениях</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-80 space-y-2">
            <Label>Фильтр по покупателю</Label>
            <Select value={selectedCustomer ? String(selectedCustomer) : "all"} onValueChange={(value) => setSelectedCustomer(value === "all" ? null : Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Все покупатели" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все покупатели</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={String(client.id)}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {ownedContracts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Договоров пока нет. Создайте договор, чтобы добавлять позиции.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Договор</TableHead>
                  <TableHead>Сумма (без НДС)</TableHead>
                  <TableHead>Сумма (с НДС)</TableHead>
                  <TableHead>Доставка</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractSummaries.map(({ contract, items, totalWithoutVat, totalWithVat, deliveryEnabled }) => (
                  <TableRow key={contract.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{contract.contract_number}</p>
                          <p className="text-xs text-muted-foreground">{customersById.get(contract.customer_id)?.name ?? "Неизвестно"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">${totalWithoutVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="font-semibold text-foreground">${totalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{deliveryEnabled ? <Badge variant="secondary">Включена</Badge> : <Badge variant="outline">Без доставки</Badge>}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openManageDialog(contract.id)}>
                        {items.length ? "Редактировать" : "Добавить"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

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
                <DialogTitle className="font-display text-xl">Управление позициями: {activeContractId ? contractsById.get(activeContractId)?.contract_number : ""}</DialogTitle>
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
                      <Input type="number" min="0" step="0.01" value={newItem.price} onChange={(event) => setNewItem({ ...newItem, price: Number(event.target.value) })} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Цена (с НДС)</Label>
                      <Input value={(newItem.price * (newItem.vat_enabled ? 1 + VAT_RATE : 1)).toFixed(2)} readOnly />
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
                        <Button onClick={handleAddItem} disabled={!newItem.product_id || createContractItem.isPending}>
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
                                        <Input value={(edited.price * (edited.vat_enabled ? 1 + VAT_RATE : 1)).toFixed(2)} readOnly />
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
                            <Button
                              variant="outline"
                              onClick={() => void handlePinAndSaveAppendix(appendixNumber)}
                              disabled={updateContractItem.isPending || appendixItems.length === 0}
                            >
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
