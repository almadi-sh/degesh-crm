import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useDebtSummary, useDebtors, type Debtor } from "@/hooks/useDebts";
import { DebtorDetailRow } from "@/components/debtors/DebtorDetailRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  HandCoins,
  Phone,
  PhoneOff,
  Users2,
  Layers,
  PhoneCall,
} from "lucide-react";

const currency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const percent = (v: number) => `${(v * 100).toFixed(1)}%`;

const priorityBadge = (priority: string) => {
  if (priority === "Высокий") return "bg-red-100 text-red-700 hover:bg-red-100";
  if (priority === "Средний") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  return "bg-muted text-muted-foreground hover:bg-muted";
};

const formatPhone = (phone: string) => phone.replace(/[^\d+]/g, "");

const PAGE_SIZE = 20;
const PRIORITIES = ["Все", "Высокий", "Средний", "Низкий"] as const;

export default function Debtors() {
  const { data: summary, isLoading: summaryLoading } = useDebtSummary();
  const { data: debtorsData, isLoading: debtorsLoading } = useDebtors();

  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("Все");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(0);

  const debtors = debtorsData?.items ?? [];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return debtors.filter((d) => {
      if (priority !== "Все" && d.priority !== priority) return false;
      if (activeOnly && !d.is_active_buyer) return false;
      if (needle) {
        const inName = d.company_name?.toLowerCase().includes(needle);
        const inBin = d.bin_iin?.includes(needle);
        if (!inName && !inBin) return false;
      }
      return true;
    });
  }, [debtors, search, priority, activeOnly]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const maxTop = summary?.top_debtors?.[0]?.total_debt ?? 0;
  const maxBucket = Math.max(1, ...(summary?.buckets ?? []).map((b) => b.amount));

  const resetPage = () => setPage(0);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display sm:text-3xl">Должники</h1>
          <p className="mt-1 text-muted-foreground">
            Дебиторская задолженность (счёт 1210)
            {summary?.report_date ? ` на ${summary.report_date}` : ""} · приоритеты обзвона и связь с продажами
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Общая дебиторка"
            value={currency.format(summary?.total_debt ?? 0)}
            subtitle={`${number.format(summary?.contract_lines ?? 0)} строк договоров`}
            icon={HandCoins}
          />
          <StatsCard
            title="Должников"
            value={number.format(summary?.debtor_count ?? 0)}
            subtitle={`${summary?.high_priority ?? 0} с высоким приоритетом`}
            icon={Users2}
          />
          <StatsCard
            title="Средний долг"
            value={currency.format(summary?.average_debt ?? 0)}
            subtitle={`Макс. ${compact.format(summary?.max_debt ?? 0)} ₸`}
            icon={Layers}
          />
          <StatsCard
            title="Концентрация топ-10"
            value={summary ? percent(summary.top10_share) : "—"}
            subtitle="Доля 10 крупнейших"
            icon={AlertTriangle}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Топ-10 должников</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(summary?.top_debtors ?? []).map((d, i) => (
                <div key={(d.bin_iin ?? "") + i} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-5 text-muted-foreground">{i + 1}.</span>
                      <span className="truncate font-medium" title={d.company_name}>{d.company_name}</span>
                      {d.phone ? (
                        <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <PhoneOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                      )}
                    </span>
                    <span className="whitespace-nowrap font-semibold">{currency.format(d.total_debt)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-red-500/80"
                      style={{ width: `${maxTop ? (d.total_debt / maxTop) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {!summaryLoading && (summary?.top_debtors?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Нет данных</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Распределение долга по размеру</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(summary?.buckets ?? []).map((b) => (
                <div key={b.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{b.label}</span>
                    <span className="text-muted-foreground">
                      <Badge variant="secondary" className="mr-2">{b.count}</Badge>
                      {currency.format(b.amount)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(b.amount / maxBucket) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-muted-foreground">С телефоном</p>
                  <p className="text-lg font-semibold">
                    {summary?.with_phone ?? 0} / {summary?.debtor_count ?? 0}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-muted-foreground">Активные покупатели</p>
                  <p className="text-lg font-semibold">{summary?.active_buyers ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <PhoneCall className="h-5 w-5 text-primary" />
                Приоритетный список обзвона
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Отсортировано по сумме долга. «Активный» — покупал за последние 6 месяцев.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <Button
                    key={p}
                    variant={priority === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPriority(p);
                      resetPage();
                    }}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant={activeOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveOnly((v) => !v);
                    resetPage();
                  }}
                >
                  Только активные
                </Button>
              </div>
              <Input
                placeholder="Поиск по компании или БИН"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                className="lg:w-72"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Приоритет</TableHead>
                    <TableHead>Компания</TableHead>
                    <TableHead className="text-right">Долг</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead className="text-right">Покупал</TableHead>
                    <TableHead>Топ-товар</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtorsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Загрузка…
                      </TableCell>
                    </TableRow>
                  ) : pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Ничего не найдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((d: Debtor) => (
                      <DebtorDetailRow key={(d.bin_iin ?? "") + d.priority_rank} debtor={d} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                {filtered.length > 0
                  ? `Показано ${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} из ${number.format(filtered.length)}`
                  : "0 должников"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 0}
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                >
                  Назад
                </Button>
                <span className="text-sm text-muted-foreground">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage + 1 >= pageCount}
                  onClick={() => setPage(safePage + 1)}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
