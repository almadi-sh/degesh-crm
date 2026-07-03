import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventorySnapshot } from "@/hooks/useInventory";
import { useWarehouseStock, useWarehouseSummary } from "@/hooks/useWarehouseStock";
import { Boxes, Filter, Package, Warehouse } from "lucide-react";

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

  const { data: stockData, isLoading: stockLoading } = useWarehouseStock();
  const { data: stockSummary } = useWarehouseSummary();
  const [warehouse, setWarehouse] = useState<string>("all");
  const [stockSearch, setStockSearch] = useState("");

  const stockItems = stockData?.items ?? [];
  const warehouses = stockSummary?.warehouses ?? [];

  const filteredStock = useMemo(() => {
    const needle = stockSearch.trim().toLowerCase();
    return stockItems.filter((it) => {
      if (warehouse !== "all" && it.warehouse !== warehouse) return false;
      if (needle && !it.product_name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [stockItems, warehouse, stockSearch]);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground font-display sm:text-3xl">
            <Warehouse className="h-7 w-7 text-primary" />
            Склады и товары
          </h1>
          <p className="mt-1 text-muted-foreground">Остатки по складам и агрегированная сводка по товарам</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatsCard
            title="Позиций на складах"
            value={formatNumber(stockSummary?.total_items ?? 0)}
            subtitle={`${warehouses.length} складов`}
            icon={Boxes}
          />
          <StatsCard
            title="Уникальных товаров"
            value={formatNumber(stockSummary?.distinct_products ?? 0)}
            subtitle="По всем складам"
            icon={Package}
          />
          <StatsCard
            title="Складов"
            value={formatNumber(warehouses.length)}
            subtitle={warehouses.map((w) => w.warehouse).join(", ") || "—"}
            icon={Warehouse}
          />
        </div>

        <Card>
          <CardHeader className="gap-4">
            <CardTitle className="text-lg">Остатки по складам</CardTitle>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={warehouse === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWarehouse("all")}
                >
                  Все склады
                </Button>
                {warehouses.map((w) => (
                  <Button
                    key={w.warehouse}
                    variant={warehouse === w.warehouse ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWarehouse(w.warehouse)}
                  >
                    {w.warehouse}
                    <span className="ml-1.5 text-xs opacity-70">{w.item_count}</span>
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Поиск по товару"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="lg:w-64"
              />
            </div>
          </CardHeader>
          <CardContent>
            {stockLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Загрузка…</p>
            ) : stockItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Остатки не загружены. Импортируйте файл остатков (scripts/import_warehouse_stock.py).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Склад</TableHead>
                      <TableHead>Товар</TableHead>
                      <TableHead className="text-right">Остаток</TableHead>
                      <TableHead>Ед. изм.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStock.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <Badge variant="outline">{it.warehouse}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{it.product_name}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {it.quantity != null ? formatNumber(it.quantity) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{it.unit ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {filteredStock.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                          Ничего не найдено
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <CardTitle className="text-lg">Сводка по товарам (приход / брони / остаток)</CardTitle>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Поиск по товару или поставщику"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="max-w-md"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" className="gap-2" disabled>
                  <Filter className="h-4 w-4" />
                  Фильтры
                </Button>
                <Select value={supplierScopeFilter} onValueChange={(value) => setSupplierScopeFilter(value as "all" | "international" | "domestic")}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Тип поставщика" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все поставщики</SelectItem>
                    <SelectItem value="international">Международный</SelectItem>
                    <SelectItem value="domestic">Внутренний</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={productTypeFilter} onValueChange={(value) => setProductTypeFilter(value as "all" | "pesticide" | "fertilizer" | "seeds")}>
                  <SelectTrigger className="w-[200px]">
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
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            ) : (
              <div className="overflow-x-auto">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
