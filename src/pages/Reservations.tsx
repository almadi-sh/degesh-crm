import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useInventorySnapshot, useReservationsFeed } from "@/hooks/useInventory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSupplierItems } from "@/hooks/useSupplierItems";
import { getSupplierItemWorkflow } from "@/lib/supplierWorkflow";
import { useClients } from "@/hooks/useClients";

const formatNumber = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export default function Reservations() {
  const { data: feed = [], isLoading } = useReservationsFeed();
  const { data: snapshot = [] } = useInventorySnapshot();
  const { data: supplierItems = [] } = useSupplierItems();
  const { data: clients = [] } = useClients();

  const totalReservedByProduct = feed.reduce<Record<string, number>>((acc, row) => {
    acc[row.product_name] = (acc[row.product_name] ?? 0) + row.quantity;
    return acc;
  }, {});

  const availableByProduct = snapshot.reduce<Record<string, number>>((acc, row) => {
    acc[row.product_name] = row.available_total;
    return acc;
  }, {});

  const buyerCityByName = clients.reduce<Record<string, string>>((acc, item) => {
    if (item.city) acc[item.name] = item.city;
    return acc;
  }, {});

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">Брони</h1>
          <p className="text-muted-foreground mt-1">Статус реализации учитывает этап растаможки и контроль остатка.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка броней...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Покупатель</TableHead>
                  <TableHead>Товар</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead>Склад отгрузки</TableHead>
                  <TableHead>Куда</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Переход</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.map((row) => {
                  const matchingSupplierItem = supplierItems.find((item) => item.name === row.product_name);
                  const workflow = matchingSupplierItem ? getSupplierItemWorkflow(matchingSupplierItem.id) : null;
                  const isReady = workflow?.customsStatus === "ready";
                  const reservedTotal = totalReservedByProduct[row.product_name] ?? 0;
                  const availableTotal = availableByProduct[row.product_name] ?? 0;
                  const exceeds = reservedTotal > availableTotal;

                  return (
                    <TableRow key={row.reservation_id}>
                      <TableCell>{row.employee_name}</TableCell>
                      <TableCell>{row.customer_name}</TableCell>
                      <TableCell>{row.product_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                      <TableCell>{workflow?.warehouse ?? "—"}</TableCell>
                      <TableCell>{buyerCityByName[row.customer_name] ?? "город покупателя"}</TableCell>
                      <TableCell>
                        {!isReady ? (
                          <Badge variant="secondary">Не готов к реализации (не растаможен)</Badge>
                        ) : exceeds ? (
                          <Badge variant="destructive">Превышен остаток: +{formatNumber(reservedTotal - availableTotal)}</Badge>
                        ) : (
                          <Badge className="bg-emerald-600">Готов к реализации</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link className="text-primary underline" to={`/contract-items?contractId=${row.contract_id}&appendixNumber=${row.appendix_number}`}>
                          Открыть приложение
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
