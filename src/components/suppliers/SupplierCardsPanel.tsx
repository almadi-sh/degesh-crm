import { useMemo, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useCreateProduct, useProducts, useUpdateProduct } from "@/hooks/useProducts";
import { useInventory } from "@/hooks/useInventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil } from "lucide-react";

interface ProductForm {
  name: string;
  unit: string;
  price: number;
  quantity_available: number;
  customs_cleared: boolean;
}

const emptyForm: ProductForm = {
  name: "",
  unit: "шт",
  price: 0,
  quantity_available: 0,
  customs_cleared: false,
};

export function SupplierCardsPanel() {
  const { data: suppliers = [] } = useClients();
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeSupplierId = selectedSupplierId ?? suppliers[0]?.id ?? null;
  const { data: products = [] } = useProducts(activeSupplierId ? { supplier_id: activeSupplierId } : undefined);
  const { data: inventoryItems = [] } = useInventory(activeSupplierId ? { supplier_id: activeSupplierId } : undefined);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const inventoryByProductId = useMemo(
    () => new Map(inventoryItems.map((inventoryItem) => [inventoryItem.product_id, inventoryItem])),
    [inventoryItems],
  );
  const warehouseRows = useMemo(
    () =>
      products.map((product) => {
        const inventory = inventoryByProductId.get(product.id);
        return {
          productId: product.id,
          productName: product.name,
          quantityAvailable: inventory?.quantity_available ?? 0,
          customsStatus: inventory?.customs_status ?? (product.customs_cleared ? "растаможен" : "не растаможен"),
          shipmentStatus: inventory?.shipment_status ?? (product.customs_cleared ? "готов к отгрузке" : "не готов к отгрузке"),
        };
      }),
    [inventoryByProductId, products],
  );

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (productId: number) => {
    const product = products.find((item) => item.id === productId);
    const inventory = inventoryItems.find((item) => item.product_id === productId);
    if (!product) return;

    setEditingId(product.id);
    setFormData({
      name: product.name,
      unit: product.unit,
      price: product.price,
      quantity_available: inventory?.quantity_available ?? 0,
      customs_cleared: product.customs_cleared,
    });
    setDialogOpen(true);
  };

  const submitProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeSupplierId) return;

    if (editingId) {
      await updateProduct.mutateAsync({ id: editingId, supplier_id: activeSupplierId, ...formData });
    } else {
      await createProduct.mutateAsync({ supplier_id: activeSupplierId, ...formData });
    }

    setDialogOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 border rounded-xl bg-card p-3 space-y-2 h-fit">
          {suppliers.map((supplier) => (
            <Button
              key={supplier.id}
              variant={activeSupplierId === supplier.id ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedSupplierId(supplier.id)}
            >
              {supplier.name}
            </Button>
          ))}
        </div>

        <div className="col-span-9 border rounded-xl bg-card p-4">
          {!activeSupplierId ? (
            <p className="text-muted-foreground">Сначала добавьте контрагента.</p>
          ) : (
            <Tabs defaultValue="products" className="space-y-4">
              <TabsList>
                <TabsTrigger value="products">Товары</TabsTrigger>
                <TabsTrigger value="warehouse">Склады и товары</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openCreateDialog} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Добавить товар
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingId ? "Редактировать товар" : "Новый товар"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={submitProduct} className="space-y-3">
                        <div className="space-y-2">
                          <Label>Название</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Ед. изм.</Label>
                            <Input
                              value={formData.unit}
                              onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Цена</Label>
                            <Input
                              type="number"
                              min={0}
                              value={formData.price}
                              onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Количество на складе</Label>
                          <Input
                            type="number"
                            min={0}
                            value={formData.quantity_available}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, quantity_available: Number(e.target.value) }))
                            }
                            required
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="customs"
                            checked={formData.customs_cleared}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({ ...prev, customs_cleared: Boolean(checked) }))
                            }
                          />
                          <Label htmlFor="customs">Растаможен</Label>
                        </div>
                        <div className="flex justify-end">
                          <Button type="submit">{editingId ? "Сохранить" : "Создать"}</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Ед.</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Растаможен</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>{product.price}</TableCell>
                        <TableCell>{product.customs_cleared ? "Да" : "Нет"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(product.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="warehouse">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Товар</TableHead>
                      <TableHead>Доступно</TableHead>
                      <TableHead>Статус растаможки</TableHead>
                      <TableHead>Статус отгрузки</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseRows.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell>{item.productName ?? `#${item.productId}`}</TableCell>
                        <TableCell>{item.quantityAvailable}</TableCell>
                        <TableCell>{item.customsStatus}</TableCell>
                        <TableCell>{item.shipmentStatus}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
