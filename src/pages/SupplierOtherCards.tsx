import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuppliers } from "@/hooks/useSuppliers";
import { SupplierItemInsert, SupplierItemType, useCreateSupplierItem, useDeleteSupplierItem, useSupplierItems } from "@/hooks/useSupplierItems";
import { getSupplierItemWorkflow, setSupplierItemWorkflow } from "@/lib/supplierWorkflow";
import { formatCreatedAt, getSupplierCreationMeta } from "@/lib/counterpartyMeta";
import { useCreateSupplier } from "@/hooks/useSuppliers";
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";

const SUPPLIER_KIND_STORAGE_KEY = "supplierKindMap";
type SupplierKind = "supplier" | "other";

const ITEM_TYPE_LABELS: Record<SupplierItemType, string> = {
  service: "Услуги",
  seeds: "Семена",
  pesticide: "СЗР",
  fertilizer: "Удобрения",
};

const WAREHOUSES = ["Алматы", "Астана", "Шымкент", "Костанай"];

const getSupplierKindMap = (): Record<string, SupplierKind> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SUPPLIER_KIND_STORAGE_KEY) ?? "{}") as Record<string, SupplierKind>;
  } catch {
    return {};
  }
};

export default function SupplierOtherCards() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const pageTitle = "Прочие";
  const pageDescription = "Раздел объединяет список прочих контрагентов и карточки с товарами.";

  const { data: suppliers = [] } = useSuppliers();
  const [search, setSearch] = useState("");
  const [activeSupplierId, setActiveSupplierId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [openOtherDialog, setOpenOtherDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("goods");
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    supplier_scope: "domestic" as "international" | "domestic",
    bin_iin: "",
    country: "",
    city: "",
    email: "",
    contact_person_1: "",
    contact_person_2: "",
    phone: "",
  });
  const [formData, setFormData] = useState<Omit<SupplierItemInsert, "supplier_id">>({
    name: "",
    quantity_available: 0,
    purchase_price: 0,
    item_type: "seeds",
    unit: "кг",
    is_active: true,
  });
  const [purchaseContractCreated, setPurchaseContractCreated] = useState(false);
  const [shippingDocsChecked, setShippingDocsChecked] = useState(false);
  const [customsStatus, setCustomsStatus] = useState<"not_ready" | "ready">("not_ready");
  const [warehouse, setWarehouse] = useState("Алматы");

  const createItem = useCreateSupplierItem();
  const createSupplier = useCreateSupplier();
  const deleteItem = useDeleteSupplierItem();
  const supplierKinds = getSupplierKindMap();

  const visibleSuppliers = useMemo(
    () => suppliers.filter((item) => (supplierKinds[String(item.id)] ?? "supplier") === "other"),
    [suppliers, supplierKinds],
  );

  const filteredSuppliers = useMemo(
    () =>
      visibleSuppliers.filter((item) =>
        [item.name, item.bin_iin, item.city, item.contact_person, item.notes]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(search.toLowerCase())),
      ),
    [visibleSuppliers, search],
  );

  useEffect(() => {
    const supplierId = Number(searchParams.get("supplierId"));
    if (!Number.isNaN(supplierId) && supplierId > 0) {
      setActiveSupplierId(supplierId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (filteredSuppliers.length === 0) {
      setActiveSupplierId(null);
      return;
    }
    const exists = filteredSuppliers.some((item) => item.id === activeSupplierId);
    if (!exists) {
      setActiveSupplierId(filteredSuppliers[0].id);
    }
  }, [activeSupplierId, filteredSuppliers]);

  const activeSupplier = useMemo(
    () => filteredSuppliers.find((item) => item.id === activeSupplierId) ?? null,
    [filteredSuppliers, activeSupplierId],
  );
  const activeSupplierMeta = activeSupplier ? getSupplierCreationMeta(activeSupplier.id) : null;

  const { data: items = [] } = useSupplierItems(activeSupplier?.id ?? undefined);

  const createOtherSupplier = async () => {
    const isInternational = supplierForm.supplier_scope === "international";
    if (!supplierForm.name.trim()) return;
    if (!supplierForm.contact_person_1.trim()) return;
    if (!supplierForm.city.trim()) return;
    if (!isInternational && supplierForm.bin_iin && supplierForm.bin_iin.length !== 12) {
      alert("БИН/ИИН должен содержать 12 цифр");
      return;
    }
    if (isInternational && !supplierForm.country.trim()) {
      alert("Для международного контрагента страна обязательна");
      return;
    }

    const creator = user?.name ?? "Неизвестный аккаунт";
    const created = await createSupplier.mutateAsync({
      name: supplierForm.name,
      legal_form: isInternational ? "Международный" : "Внутренний",
      bin_iin: supplierForm.bin_iin || null,
      city: supplierForm.city,
      legal_address: isInternational ? `${supplierForm.country}, ${supplierForm.city}` : supplierForm.city,
      email: supplierForm.email || null,
      contact_person: supplierForm.contact_person_2
        ? `${supplierForm.contact_person_1}; ${supplierForm.contact_person_2}`
        : supplierForm.contact_person_1,
      phone: supplierForm.phone || null,
      notes: isInternational ? `Страна: ${supplierForm.country}` : "Прочий поставщик",
      created_by_user: creator,
    });

    const map = getSupplierKindMap();
    map[String(created.id)] = "other";
    window.localStorage.setItem(SUPPLIER_KIND_STORAGE_KEY, JSON.stringify(map));
    setOpenOtherDialog(false);
    setSupplierForm({
      name: "",
      supplier_scope: "domestic",
      bin_iin: "",
      country: "",
      city: "",
      email: "",
      contact_person_1: "",
      contact_person_2: "",
      phone: "",
    });
    setActiveSupplierId(created.id);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeSupplier) return;
    const created = await createItem.mutateAsync({ ...formData, supplier_id: activeSupplier.id });
    setSupplierItemWorkflow(created.id, {
      purchaseContractCreated,
      shippingDocsChecked,
      customsStatus,
      warehouse,
    });
    setOpen(false);
    setFormData({
      name: "",
      quantity_available: 0,
      purchase_price: 0,
      item_type: "seeds",
      unit: "кг",
      is_active: true,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">{pageTitle}</h1>
            <p className="text-muted-foreground mt-1">{pageDescription}</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={openOtherDialog} onOpenChange={setOpenOtherDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Добавить контрагента
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Прочие поставщики</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Наименование *</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Международный/Внутренний</Label>
                    <Select value={supplierForm.supplier_scope} onValueChange={(value) => setSupplierForm({ ...supplierForm, supplier_scope: value as "international" | "domestic" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="international">Международный</SelectItem>
                        <SelectItem value="domestic">Внутренний</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>БИН/ИИН (опционально)</Label><Input value={supplierForm.bin_iin} maxLength={12} onChange={(e) => setSupplierForm({ ...supplierForm, bin_iin: e.target.value.replace(/\D/g, "") })} /></div>
                  {supplierForm.supplier_scope === "international" && (
                    <div className="space-y-2"><Label>Страна *</Label><Input value={supplierForm.country} onChange={(e) => setSupplierForm({ ...supplierForm, country: e.target.value })} /></div>
                  )}
                  <div className="space-y-2"><Label>Город *</Label><Input value={supplierForm.city} onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Контактное лицо 1 *</Label><Input value={supplierForm.contact_person_1} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person_1: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Контактное лицо 2</Label><Input value={supplierForm.contact_person_2} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person_2: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Телефон</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
                </div>
                <Button className="mt-4 w-full" onClick={createOtherSupplier}>Создать контрагента</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Список контрагентов</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Поиск по контрагенту..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
              {filteredSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => setActiveSupplierId(supplier.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left ${activeSupplier?.id === supplier.id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <p className="font-medium">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground">{supplier.bin_iin ?? "Без BIN/IIN"}</p>
                </button>
              ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Карточка контрагента</CardTitle>
            </CardHeader>
            <CardContent>
            {!activeSupplier ? (
              <p className="text-sm text-muted-foreground">Контрагент не выбран.</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xl font-semibold leading-tight">{activeSupplier.name}</p>
                      <p className="text-sm text-muted-foreground">{activeSupplier.legal_form ?? "Контрагент"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">БИН/ИИН</p>
                      <p>{activeSupplier.bin_iin ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Юридический адрес</p>
                      <p>{activeSupplier.legal_address ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Контактное лицо</p>
                      <p>{activeSupplier.contact_person ?? "—"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Город</p>
                      <p>{activeSupplier.city ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Телефон</p>
                      <p>{activeSupplier.phone ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                      <p>{activeSupplier.email ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Кто создал</p>
                      <p>{activeSupplierMeta?.createdBy ?? activeSupplier.created_by_user ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {activeSupplierMeta?.createdAt ? formatCreatedAt(activeSupplierMeta.createdAt) : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="goods">Товары</TabsTrigger>
                    <TabsTrigger value="contracts">Сделки / договоры</TabsTrigger>
                  </TabsList>
                  <TabsContent value="goods" className="space-y-3">
                    <div className="flex justify-end">
                      <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                          <Button disabled={!activeSupplier}>Добавить товар</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Новый товар контрагента</DialogTitle></DialogHeader>
                          <form onSubmit={submit} className="space-y-3">
                            <div className="space-y-2"><Label>Наименование</Label><Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2"><Label>Количество</Label><Input type="number" min="0" step="0.01" value={formData.quantity_available} onChange={(e) => setFormData({ ...formData, quantity_available: Number(e.target.value) })} /></div>
                              <div className="space-y-2"><Label>Цена закупа</Label><Input type="number" min="0" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })} /></div>
                            </div>
                            <div className="space-y-2">
                              <Label>Тип товара</Label>
                              <Select value={formData.item_type} onValueChange={(value) => setFormData({ ...formData, item_type: value as SupplierItemType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pesticide">СЗР</SelectItem>
                                  <SelectItem value="fertilizer">Удобрения</SelectItem>
                                  <SelectItem value="seeds">Семена</SelectItem>
                                  <SelectItem value="service">Услуги</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Склад прибытия</Label>
                              <Select value={warehouse} onValueChange={setWarehouse}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{WAREHOUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 rounded-md border p-3">
                              <p className="text-sm font-medium">Чекпоинты</p>
                              <div className="flex items-center gap-2"><Checkbox checked={purchaseContractCreated} onCheckedChange={(v) => setPurchaseContractCreated(Boolean(v))} /><Label>Создать договор покупки</Label></div>
                              <div className="flex items-center gap-2"><Checkbox checked={shippingDocsChecked} onCheckedChange={(v) => setShippingDocsChecked(Boolean(v))} /><Label>Проверка документов отгрузки</Label></div>
                              <div className="space-y-2">
                                <Label>Готово к растаможке</Label>
                                <Select value={customsStatus} onValueChange={(value) => setCustomsStatus(value as "not_ready" | "ready")}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_ready">Не готово</SelectItem>
                                    <SelectItem value="ready">Готово</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button className="w-full" type="submit">Сохранить</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Table>
                      <TableHeader><TableRow><TableHead>Товар</TableHead><TableHead>Тип</TableHead><TableHead>Кол-во</TableHead><TableHead>Склад</TableHead><TableHead>Растаможка</TableHead><TableHead /></TableRow></TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const workflow = getSupplierItemWorkflow(item.id);
                          return (
                            <TableRow key={item.id}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{ITEM_TYPE_LABELS[item.item_type]}</TableCell>
                              <TableCell>{item.quantity_available}</TableCell>
                              <TableCell>{workflow.warehouse}</TableCell>
                              <TableCell>
                                <Badge variant={workflow.customsStatus === "ready" ? "default" : "secondary"}>
                                  {workflow.customsStatus === "ready" ? "Готов к реализации" : "Не растаможен"}
                                </Badge>
                              </TableCell>
                              <TableCell><Button variant="ghost" onClick={() => deleteItem.mutate(item.id)}>Удалить</Button></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  <TabsContent value="contracts">
                    <Table>
                      <TableHeader><TableRow><TableHead>Товар</TableHead><TableHead>Договор покупки</TableHead><TableHead>Документы отгрузки</TableHead><TableHead>История</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const workflow = getSupplierItemWorkflow(item.id);
                          return (
                            <TableRow key={item.id}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{workflow.purchaseContractCreated ? "Создан" : "Не создан"}</TableCell>
                              <TableCell>{workflow.shippingDocsChecked ? "Проверены" : "Ожидают"}</TableCell>
                              <TableCell>{workflow.customsStatus === "ready" ? "Готов к реализации" : "Этап закупа"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </div>
            )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
