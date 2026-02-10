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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getContractOwnerMap, getOwnedContractIds } from "@/lib/contractOwnership";
import { ContractDocumentEditor } from "@/components/contracts/ContractDocumentEditor";
import { useUpdateContractDocument } from "@/hooks/useContracts";
import { toast } from "sonner";
import { apiFetchResponse } from "@/lib/apiClient";

interface EditableItem {
  product_id: number;
  quantity: number;
  price: number;
  vat_enabled: boolean;
  delivery_enabled: boolean;
  delivery_terms: string;
}

const VAT_RATE = 0.16;

export default function ContractItems() {
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const { data: contracts = [] } = useContracts(
    selectedCustomer ? { customer_id: selectedCustomer } : undefined,
  );
  const { data: contractItems = [] } = useContractItems(
    selectedCustomer ? { customer_id: selectedCustomer } : undefined,
  );
  const createContractItem = useCreateContractItem();
  const updateContractItem = useUpdateContractItem();
  const deleteContractItem = useDeleteContractItem();
  const updateContractDocument = useUpdateContractDocument();

  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [activeContractId, setActiveContractId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState<EditableItem>({
    product_id: 0,
    quantity: 1,
    price: 0,
    vat_enabled: false,
    delivery_enabled: false,
    delivery_terms: "",
  });
  const [editedItems, setEditedItems] = useState<Record<number, EditableItem>>({});
  const [ownerMap] = useState(() => getContractOwnerMap());

  const ownedContractIds = useMemo(
    () => new Set(getOwnedContractIds(ownerMap, user?.id ?? "")),
    [ownerMap, user?.id],
  );
  const ownedContracts = useMemo(
    () => contracts.filter((contract) => ownedContractIds.has(contract.id)),
    [contracts, ownedContractIds],
  );
  const ownedContractItems = useMemo(
    () => contractItems.filter((item) => ownedContractIds.has(item.contract_id)),
    [contractItems, ownedContractIds],
  );

  const customersById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const contractsById = useMemo(
    () => new Map(ownedContracts.map((contract) => [contract.id, contract])),
    [ownedContracts],
  );
  const activeContract = activeContractId ? contractsById.get(activeContractId) : undefined;
  const isContractConfirmed = activeContract?.status === "Confirmed";
  const activeCustomer = activeContract ? customersById.get(activeContract.customer_id) : undefined;

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

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

  const activeItems = useMemo(
    () => (activeContractId ? itemsByContract.get(activeContractId) ?? [] : []),
    [activeContractId, itemsByContract],
  );

  const contractSummaries = useMemo(() => {
    return ownedContracts.map((contract) => {
      const items = itemsByContract.get(contract.id) ?? [];
      const totalWithoutVat = items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );
      const totalWithVat = items.reduce(
        (sum, item) =>
          sum +
          (item.total_amount ??
            item.quantity * item.price * (item.vat_enabled ? 1 + VAT_RATE : 1)),
        0,
      );
      const deliveryEnabled = items.some((item) => item.delivery_enabled);
      return {
        contract,
        items,
        totalWithoutVat,
        totalWithVat,
        deliveryEnabled,
      };
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

  const openManageDialog = (contractId: number) => {
    setActiveContractId(contractId);
    setIsManageDialogOpen(true);
  };

  const closeManageDialog = () => {
    setIsManageDialogOpen(false);
    setActiveContractId(null);
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

  const updateEditedItem = (
    id: number,
    field: keyof EditableItem,
    value: number | boolean | string,
  ) => {
    setEditedItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleDownloadContract = async () => {
    if (!activeContract) return;
    try {
      const response = await apiFetchResponse(`/api/v1/contracts/${activeContract.id}/document/export`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename=([^;]+)/i);
      const fallbackFilename = `contract-${activeContract.contract_number}.docx`;
      const filename = filenameMatch?.[1]?.trim().replace(/^"|"$/g, "") || fallbackFilename;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Contract downloaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download contract";
      toast.error(message);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-display">Contract Items</h1>
            <p className="text-muted-foreground mt-1">
              Review contract totals and manage products per agreement
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-80 space-y-2">
            <Label>Filter by customer</Label>
            <Select
              value={selectedCustomer ? String(selectedCustomer) : "all"}
              onValueChange={(value) =>
                setSelectedCustomer(value === "all" ? null : Number(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
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
            <div className="p-8 text-center text-muted-foreground">
              No contracts yet. Create a contract to start adding items.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Contract</TableHead>
                  <TableHead>Price (without VAT)</TableHead>
                  <TableHead>Price (with VAT)</TableHead>
                  <TableHead>Delivery</TableHead>
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
                          <p className="font-medium text-foreground">
                            {contract.contract_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {customersById.get(contract.customer_id)?.name ?? "Unknown"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      ${totalWithoutVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      ${totalWithVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {deliveryEnabled ? (
                        <Badge variant="secondary">Enabled</Badge>
                      ) : (
                        <Badge variant="outline">No delivery</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openManageDialog(contract.id)}
                      >
                        {items.length ? "Edit items" : "Add items"}
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
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Manage items for {activeContractId ? contractsById.get(activeContractId)?.contract_number : ""}
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="items" className="mt-4">
              <TabsList>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="contract">Contract</TabsTrigger>
              </TabsList>
              <TabsContent value="items">
                <div className="space-y-6">
                  <div className="grid grid-cols-12 gap-3 items-end rounded-lg border border-border p-4">
                    <div className="col-span-4 space-y-2">
                      <Label>Product *</Label>
                      <Select
                        value={newItem.product_id ? String(newItem.product_id) : ""}
                        onValueChange={(value) =>
                          setNewItem({ ...newItem, product_id: Number(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
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
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={newItem.quantity}
                        onChange={(event) =>
                          setNewItem({ ...newItem, quantity: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Price (without VAT)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.price}
                        onChange={(event) =>
                          setNewItem({ ...newItem, price: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Price (with VAT)</Label>
                      <Input
                        value={(newItem.price * (newItem.vat_enabled ? 1 + VAT_RATE : 1)).toFixed(2)}
                        readOnly
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={newItem.vat_enabled}
                          onCheckedChange={(checked) =>
                            setNewItem((prev) => ({ ...prev, vat_enabled: checked === true }))
                          }
                          id="vat-enabled"
                        />
                        <Label htmlFor="vat-enabled">VAT 16%</Label>
                      </div>
                    </div>
                    <div className="col-span-12 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={newItem.delivery_enabled}
                          onCheckedChange={(checked) =>
                            setNewItem({ ...newItem, delivery_enabled: Boolean(checked) })
                          }
                          id="delivery-enabled"
                        />
                        <Label htmlFor="delivery-enabled">Has delivery</Label>
                        {newItem.delivery_enabled && (
                          <Input
                            className="ml-4"
                            value={newItem.delivery_terms}
                            onChange={(event) =>
                              setNewItem({ ...newItem, delivery_terms: event.target.value })
                            }
                            placeholder="Delivery terms"
                          />
                        )}
                      </div>
                      <Button onClick={handleAddItem} disabled={!newItem.product_id || createContractItem.isPending}>
                        Add item
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Price (without VAT)</TableHead>
                          <TableHead>Price (with VAT)</TableHead>
                          <TableHead>VAT</TableHead>
                          <TableHead>Delivery</TableHead>
                          <TableHead className="w-[160px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              No items yet. Add the first product above.
                            </TableCell>
                          </TableRow>
                        ) : (
                          activeItems.map((item) => {
                            const edited = editedItems[item.id];
                            if (!edited) return null;
                            return (
                              <TableRow key={item.id} className="hover:bg-muted/50">
                                <TableCell>
                                  <Select
                                    value={edited.product_id ? String(edited.product_id) : ""}
                                    onValueChange={(value) =>
                                      updateEditedItem(item.id, "product_id", Number(value))
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select product" />
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
                                  <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={edited.quantity}
                                    onChange={(event) =>
                                      updateEditedItem(item.id, "quantity", Number(event.target.value))
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={edited.price}
                                    onChange={(event) =>
                                      updateEditedItem(item.id, "price", Number(event.target.value))
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={(edited.price * (edited.vat_enabled ? 1 + VAT_RATE : 1)).toFixed(2)}
                                    readOnly
                                  />
                                </TableCell>
                                <TableCell>
                                  <Checkbox
                                    checked={edited.vat_enabled}
                                    onCheckedChange={(checked) =>
                                      updateEditedItem(item.id, "vat_enabled", checked === true)
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={edited.delivery_enabled}
                                        onCheckedChange={(checked) =>
                                          updateEditedItem(item.id, "delivery_enabled", Boolean(checked))
                                        }
                                      />
                                      <span className="text-xs text-muted-foreground">Enabled</span>
                                    </div>
                                    {edited.delivery_enabled && (
                                      <Input
                                        value={edited.delivery_terms}
                                        onChange={(event) =>
                                          updateEditedItem(item.id, "delivery_terms", event.target.value)
                                        }
                                        placeholder="Terms"
                                      />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateItem(item.id)}
                                      disabled={updateContractItem.isPending}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteContractItem.mutateAsync(item.id)}
                                      className="text-muted-foreground hover:text-destructive"
                                    >
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
                </div>
              </TabsContent>
              <TabsContent value="contract">
                {activeContract ? (
                  isContractConfirmed ? (
                    <div className="space-y-6">
                      <div className="rounded-lg border border-border p-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Contract overview</h3>
                            <p className="text-sm text-muted-foreground">
                              Customer and items included in this contract.
                            </p>
                          </div>
                          <Button onClick={handleDownloadContract}>
                            Download contract
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Customer</p>
                            <p className="font-medium text-foreground">
                              {activeCustomer?.name ?? "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">BIN/IIN</p>
                            <p className="font-medium text-foreground">
                              {activeCustomer?.bin_iin ?? "—"}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground">Address</p>
                            <p className="font-medium text-foreground">
                              {activeCustomer?.address ?? "—"}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activeItems.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No items added yet.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                activeItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      {productsById.get(item.product_id)?.name ?? "Unknown"}
                                    </TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{item.price.toFixed(2)}</TableCell>
                                    <TableCell>
                                      {(item.total_amount ?? item.quantity * item.price).toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <ContractDocumentEditor
                        contract={activeContract}
                        isSaving={updateContractDocument.isPending}
                        onSave={async (document) => {
                          await updateContractDocument.mutateAsync({
                            id: activeContract.id,
                            contract_document: document,
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
                      Confirm the contract status to view and download the document.
                    </div>
                  )
                ) : (
                  <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
                    Select a contract to view its document.
                  </div>
                )}
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeManageDialog}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
