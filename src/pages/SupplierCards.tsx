import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSuppliers } from "@/hooks/useSuppliers";
import { SupplierItemInsert, SupplierItemType, useCreateSupplierItem, useDeleteSupplierItem, useSupplierItems } from "@/hooks/useSupplierItems";

const ITEM_TYPE_LABELS: Record<SupplierItemType, string> = {
  service: "Услуга",
  seeds: "Семена",
  pesticide: "Пестицид",
  fertilizer: "Удобрение",
};

export default function SupplierCards() {
  const { data: suppliers = [] } = useSuppliers();
  const [search, setSearch] = useState("");
  const filteredSuppliers = useMemo(() => suppliers.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())), [suppliers, search]);
  const [activeSupplierId, setActiveSupplierId] = useState<number | null>(null);
  const activeSupplier = useMemo(() => filteredSuppliers.find((item) => item.id === activeSupplierId) ?? filteredSuppliers[0], [filteredSuppliers, activeSupplierId]);
  const { data: items = [] } = useSupplierItems(activeSupplier?.id);
  const createItem = useCreateSupplierItem();
  const deleteItem = useDeleteSupplierItem();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<SupplierItemInsert, "supplier_id">>({
    name: "",
    quantity_available: 0,
    purchase_price: 0,
    item_type: "service",
    unit: "кг",
    is_active: true,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeSupplier) return;
    await createItem.mutateAsync({ ...formData, supplier_id: activeSupplier.id });
    setOpen(false);
  };

  return (
    <MainLayout>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <Input placeholder="Поиск поставщика" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="space-y-2">
            {filteredSuppliers.map((supplier) => (
              <Button key={supplier.id} variant={activeSupplier?.id === supplier.id ? "default" : "outline"} className="w-full justify-start" onClick={() => setActiveSupplierId(supplier.id)}>{supplier.name}</Button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Товары поставщика: {activeSupplier?.name ?? "—"}</h2>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button disabled={!activeSupplier}>Добавить товар</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Новая позиция поставщика</DialogTitle></DialogHeader>
                <form onSubmit={submit} className="space-y-3">
                  <div className="space-y-2"><Label>Наименование</Label><Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Количество</Label><Input type="number" min="0" step="0.01" value={formData.quantity_available} onChange={(e) => setFormData({ ...formData, quantity_available: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>Цена закупа</Label><Input type="number" min="0" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Тип</Label>
                      <Select value={formData.item_type} onValueChange={(value) => setFormData({ ...formData, item_type: value as SupplierItemType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Единица</Label><Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} /></div>
                  </div>
                  <Button className="w-full" type="submit">Сохранить</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader><TableRow><TableHead>Наименование</TableHead><TableHead>Тип</TableHead><TableHead>Кол-во</TableHead><TableHead>Цена</TableHead><TableHead>Ед.</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{ITEM_TYPE_LABELS[item.item_type]}</TableCell>
                  <TableCell>{item.quantity_available}</TableCell>
                  <TableCell>{item.purchase_price}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell><Button variant="ghost" onClick={() => deleteItem.mutate(item.id)}>Удалить</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
