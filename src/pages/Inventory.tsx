import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventorySnapshot } from "@/hooks/useInventory";
import { Filter } from "lucide-react";

const formatNumber = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [supplierScopeFilter, setSupplierScopeFilter] = useState<"all" | "international" | "domestic">("all");
  const [productTypeFilter, setProductTypeFilter] = useState<"all" | "pesticide" | "fertilizer" | "seeds">("all");
  const { data: snapshot = [], isLoading } = useInventorySnapshot({
    search,
    supplier_scope: supplierScopeFilter === "all" ? undefined : supplierScopeFilter,
    product_type: productTypeFilter === "all" ? undefined : productTypeFilter,
  });

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

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
          <Button type="button" variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Фильтры
          </Button>
          <Select value={supplierScopeFilter} onValueChange={(value) => setSupplierScopeFilter(value as "all" | "international" | "domestic")}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Тип поставщика" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все поставщики</SelectItem>
              <SelectItem value="international">Международный</SelectItem>
              <SelectItem value="domestic">Внутренний</SelectItem>
            </SelectContent>
          </Select>
          <Select value={productTypeFilter} onValueChange={(value) => setProductTypeFilter(value as "all" | "pesticide" | "fertilizer" | "seeds")}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Тип товара" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы товаров</SelectItem>
              <SelectItem value="pesticide">СЗР</SelectItem>
              <SelectItem value="fertilizer">Удобрения</SelectItem>
              <SelectItem value="seeds">Семена</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableHead>Межд./Внутр.</TableHead>
                  <TableHead>Тип товара</TableHead>
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
                    <TableCell>{item.supplier_scope === "international" ? "Международный" : item.supplier_scope === "domestic" ? "Внутренний" : "—"}</TableCell>
                    <TableCell>{item.supplier_product_type === "pesticide" ? "СЗР" : item.supplier_product_type === "fertilizer" ? "Удобрения" : item.supplier_product_type === "seeds" ? "Семена" : "—"}</TableCell>
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
