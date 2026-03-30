import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProducts } from "@/hooks/useProducts";
import { useCreateInventoryReceipt, useInventoryReceipts } from "@/hooks/useInventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatNumber = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export default function Incoming() {
  const { data: products = [] } = useProducts();
  const { data: receipts = [], isLoading } = useInventoryReceipts();
  const createReceipt = useCreateInventoryReceipt();

  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [comment, setComment] = useState("");

  const selectedProduct = useMemo(() => products.find((item) => item.id === Number(productId)), [productId, products]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productId || !quantity) return;

    await createReceipt.mutateAsync({
      product_id: Number(productId),
      quantity: Number(quantity),
      supplier_name: supplierName || undefined,
      supplier_contract_number: contractNumber || undefined,
      comment: comment || undefined,
    });

    setProductId("");
    setQuantity("");
    setSupplierName("");
    setContractNumber("");
    setComment("");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">Поступления</h1>
          <p className="text-muted-foreground mt-1">Учет приходов на виртуальный склад: поступления и контракты закупа.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Новое поступление</h2>
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Товар</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Выберите товар" /></SelectTrigger>
                <SelectContent>
                  {products.map((item) => (
                    <SelectItem value={String(item.id)} key={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Количество</Label>
              <Input type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Поставщик</Label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Например: HANGZHOU YUNRUN" />
            </div>
            <div className="space-y-2">
              <Label>Контракт закупа</Label>
              <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="№ 25 от 13.01.2026" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Комментарий</Label>
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Дополнительная информация" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={!productId || !quantity || createReceipt.isPending}>
                {createReceipt.isPending ? "Сохраняем..." : "Добавить поступление"}
              </Button>
            </div>
          </form>
          {selectedProduct && <p className="mt-2 text-xs text-muted-foreground">Ед. измерения: {selectedProduct.unit}</p>}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">История поступлений</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Товар</TableHead>
                  <TableHead className="text-right">Количество</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Контракт закупа</TableHead>
                  <TableHead>Комментарий</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.received_at).toLocaleString("ru-RU")}</TableCell>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                    <TableCell>{row.supplier_name ?? "—"}</TableCell>
                    <TableCell>{row.supplier_contract_number ?? "—"}</TableCell>
                    <TableCell>{row.comment ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
