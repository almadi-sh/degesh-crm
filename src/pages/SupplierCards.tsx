import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { useSuppliers } from "@/hooks/useSuppliers";
import { SupplierItemInsert, SupplierItemType, useCreateSupplierItem, useDeleteSupplierItem, useSupplierItems } from "@/hooks/useSupplierItems";
import { getSupplierItemWorkflow, setSupplierItemWorkflow } from "@/lib/supplierWorkflow";

const ITEM_TYPE_LABELS: Record<SupplierItemType, string> = {
  service: "СЗР",
  seeds: "Семена",
  pesticide: "СЗР",
  fertilizer: "Удобрения",
};

const WAREHOUSES = ["Алматы", "Астана", "Шымкент", "Костанай"];

export default function SupplierCards() {
  const { data: suppliers = [] } = useSuppliers();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const filteredSuppliers = useMemo(() => suppliers.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);
  const [activeSupplierId, setActiveSupplierId] = useState<number | null>(null);
  const activeSupplier = useMemo(() => filteredSuppliers.find((item) => item.id === activeSupplierId) ?? filteredSuppliers[0], [filteredSuppliers, activeSupplierId]);

  useEffect(() => {
    const supplierId = Number(searchParams.get("supplierId"));
    if (!Number.isNaN(supplierId) && supplierId > 0) {
      setActiveSupplierId(supplierId);
    }
  }, [searchParams]);
  const { data: items = [] } = useSupplierItems(activeSupplier?.id);
  const createItem = useCreateSupplierItem();
  const deleteItem = useDeleteSupplierItem();
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!activeSupplier && filteredSuppliers.length > 0) {
      setActiveSupplierId(filteredSuppliers[0].id);
    }
  }, [activeSupplier, filteredSuppliers]);

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
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Поставщики</h1>
            <p className="text-muted-foreground mt-1">Карточки поставщиков и товары закупа в одном разделе.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/suppliers">Добавить поставщика</Link></Button>
            <Button asChild variant="outline"><Link to="/suppliers?tab=others">Добавить прочее</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <Input placeholder="Поиск поставщика" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="space-y-2">
              {filteredSuppliers.map((supplier) => {
                const count = items.filter((i) => i.supplier_id === supplier.id).length;
                return (
                  <Button key={supplier.id} variant={activeSupplier?.id === supplier.id ? "default" : "outline"} className="w-full justify-between" onClick={() => setActiveSupplierId(supplier.id)}>
                    <span>{supplier.name}</span>
                    <Badge variant={count === 0 ? "destructive" : "secondary"}>{count === 0 ? "Пусто" : `${count} тов.`}</Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-xl border bg-card p-4 space-y-4">
            <Tabs defaultValue="goods">
              <TabsList>
                <TabsTrigger value="goods">Товары</TabsTrigger>
                <TabsTrigger value="contracts">Договоры (покупки)</TabsTrigger>
              </TabsList>

              <TabsContent value="goods" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Поставщик: {activeSupplier?.name ?? "—"}</h2>
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild><Button disabled={!activeSupplier}>Добавить товар</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Новый товар поставщика</DialogTitle></DialogHeader>
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
                  <TableHeader><TableRow><TableHead>Товар</TableHead><TableHead>Тип</TableHead><TableHead>Кол-во</TableHead><TableHead>Склад</TableHead><TableHead>Растаможка</TableHead><TableHead></TableHead></TableRow></TableHeader>
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
        </div>
      </div>
    </MainLayout>
  );
}
