import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Table, TableBody, TableHead, TableHeader } from "@/components/ui/table";
import { useDebtorDetail, type Debtor } from "@/hooks/useDebts";
import { CalendarClock, ChevronDown, ChevronRight, Phone, PhoneOff } from "lucide-react";

const currency = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
const formatPhone = (phone: string) => phone.replace(/[^\d+]/g, "");

const priorityBadge = (priority: string) => {
  if (priority === "Высокий") return "bg-red-100 text-red-700 hover:bg-red-100";
  if (priority === "Средний") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  return "bg-muted text-muted-foreground hover:bg-muted";
};

export function DebtorDetailRow({ debtor }: { debtor: Debtor }) {
  const [open, setOpen] = useState(false);
  const { data: detail, isLoading } = useDebtorDetail(debtor.bin_iin ?? undefined, open);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <TableCell className="text-muted-foreground">
          <div className="flex items-center gap-1">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {debtor.priority_rank}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <Badge className={priorityBadge(debtor.priority)} variant="secondary">{debtor.priority}</Badge>
            {debtor.is_active_buyer && <span className="text-xs text-emerald-600">● активный</span>}
          </div>
        </TableCell>
        <TableCell className="max-w-[240px]">
          <div className="truncate font-medium" title={debtor.company_name ?? ""}>{debtor.company_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground">БИН {debtor.bin_iin ?? "—"} · {debtor.contract_count} дог.</div>
        </TableCell>
        <TableCell className="text-right font-semibold text-red-600 whitespace-nowrap">
          {currency.format(debtor.total_debt)}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {debtor.phone ? (
            <a href={`tel:${formatPhone(debtor.phone)}`} className="inline-flex items-center gap-1.5 whitespace-nowrap text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" />
              {debtor.phone}
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground/60">
              <PhoneOff className="h-3.5 w-3.5" />
              нет
            </span>
          )}
        </TableCell>
        <TableCell className="text-right whitespace-nowrap">
          <div>{debtor.realization_total ? currency.format(debtor.realization_total) : "—"}</div>
          {debtor.realization_last_date && (
            <div className="text-xs text-muted-foreground">посл. {debtor.realization_last_date.slice(0, 10)}</div>
          )}
        </TableCell>
        <TableCell className="max-w-[180px] truncate" title={debtor.top_product ?? ""}>
          {debtor.top_product ?? "—"}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/20 p-4">
            {isLoading ? (
              <p className="py-3 text-center text-sm text-muted-foreground">Загрузка…</p>
            ) : detail ? (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  По каким договорам и к какому сроку оплатить{detail.report_date ? ` (на ${detail.report_date})` : ""}
                </p>
                <div className="overflow-x-auto rounded-md border border-border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Договор</TableHead>
                        <TableHead>Дата договора</TableHead>
                        <TableHead className="text-right">Долг</TableHead>
                        <TableHead>Оплатить до</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.obligations.map((o, i) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-[280px]">
                            <div className="truncate font-medium" title={o.contract_name ?? ""}>
                              {o.contract_name ?? "—"}
                            </div>
                            {o.contract_number && (
                              <div className="text-xs text-muted-foreground">№{o.contract_number}</div>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {o.contract_date ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600 whitespace-nowrap">
                            {currency.format(o.debt_amount)}
                          </TableCell>
                          <TableCell>
                            {o.due_schedule.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {o.due_schedule.map((d, j) => (
                                  <span key={j} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs">
                                    {d.date}
                                    {d.percent != null ? ` · ${d.percent}%` : ""}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">график не найден</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="py-3 text-center text-sm text-muted-foreground">Нет данных</p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
