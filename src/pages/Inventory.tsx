import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInventorySnapshot, useReservationsTimeline } from "@/hooks/useInventory";

const formatNumber = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [activeProductId, setActiveProductId] = useState<number | undefined>();
  const { data: snapshot = [], isLoading } = useInventorySnapshot({ search });
  const { data: timeline = [], isLoading: isTimelineLoading } = useReservationsTimeline(activeProductId);

  const activeProduct = useMemo(
    () => snapshot.find((item) => item.product_id === activeProductId),
    [activeProductId, snapshot],
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">Inventory + Reservations</h1>
          <p className="text-muted-foreground mt-1">Unified snapshot и приоритетная лента броней по продуктам.</p>
        </div>

        <div className="max-w-md">
          <Input
            placeholder="Поиск по препарату или поставщику"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Snapshot по продуктам</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Препарат</TableHead>
                  <TableHead className="text-right">Приход</TableHead>
                  <TableHead className="text-right">В брони</TableHead>
                  <TableHead className="text-right">Остаток</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.map((item) => (
                  <TableRow
                    key={item.product_id}
                    onClick={() => setActiveProductId(item.product_id)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
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

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">
            Приоритетные брони{activeProduct ? `: ${activeProduct.product_name}` : ""}
          </h2>
          {!activeProductId ? (
            <p className="text-sm text-muted-foreground">Выберите препарат из snapshot, чтобы увидеть ленту бронирований.</p>
          ) : isTimelineLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка ленты броней...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Договор</TableHead>
                  <TableHead>Приложение</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead>Препарат</TableHead>
                  <TableHead>Срок поставки</TableHead>
                  <TableHead>Покупатель</TableHead>
                  <TableHead className="text-right">Приоритет</TableHead>
                  <TableHead>Переход</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeline.map((row) => (
                  <TableRow key={row.reservation_id}>
                    <TableCell>{row.employee_name}</TableCell>
                    <TableCell>{row.contract_number}</TableCell>
                    <TableCell>Приложение {row.appendix_number}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell>{row.delivery_due_date ?? row.delivery_terms ?? "—"}</TableCell>
                    <TableCell>{row.customer_name}</TableCell>
                    <TableCell className="text-right">{row.priority}</TableCell>
                    <TableCell>
                      <Link
                        className="text-primary underline"
                        to={`/contract-items?contractId=${row.contract_id}&appendixNumber=${row.appendix_number}`}
                      >
                        Открыть приложение
                      </Link>
                    </TableCell>
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
