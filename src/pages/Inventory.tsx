import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventorySnapshot } from "@/hooks/useInventory";

const formatNumber = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export default function Inventory() {
  const [search, setSearch] = useState("");
  const { data: snapshot = [], isLoading } = useInventorySnapshot({ search });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">Склад</h1>
          <p className="text-muted-foreground mt-1">Только агрегированная информация по остаткам без деталей контрактов.</p>
        </div>

        <div className="max-w-md">
          <Input
            placeholder="Поиск по товару или поставщику"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Сводка по товарам</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Товар</TableHead>
                  <TableHead className="text-right">Приход</TableHead>
                  <TableHead className="text-right">В брони</TableHead>
                  <TableHead className="text-right">Остаток</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell>{item.supplier_name}</TableCell>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.incoming_total)}</TableCell>
                    <TableCell className="text-right">{formatNumber(item.reserved_total)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(item.balance)}</TableCell>
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
