import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useReservationsFeed } from "@/hooks/useInventory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatNumber = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export default function Reservations() {
  const { data: feed = [], isLoading } = useReservationsFeed();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">Брони</h1>
          <p className="text-muted-foreground mt-1">Кто, что и под какой договор зарезервировал.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка броней...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сотрудник</TableHead>
                  <TableHead>Договор</TableHead>
                  <TableHead>Приложение</TableHead>
                  <TableHead>Покупатель</TableHead>
                  <TableHead>Товар</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead>Срок поставки</TableHead>
                  <TableHead className="text-right">Приоритет</TableHead>
                  <TableHead>Переход</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.map((row) => (
                  <TableRow key={row.reservation_id}>
                    <TableCell>{row.employee_name}</TableCell>
                    <TableCell>{row.contract_number}</TableCell>
                    <TableCell>Приложение {row.appendix_number}</TableCell>
                    <TableCell>{row.customer_name}</TableCell>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                    <TableCell>{row.delivery_due_date ?? row.delivery_terms ?? "—"}</TableCell>
                    <TableCell className="text-right">{row.priority}</TableCell>
                    <TableCell>
                      <Link className="text-primary underline" to={`/contract-items?contractId=${row.contract_id}&appendixNumber=${row.appendix_number}`}>
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
