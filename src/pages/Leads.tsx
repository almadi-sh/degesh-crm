import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useLeads } from "@/hooks/useLeads";
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
import { Lightbulb, Sparkles, Target, TrendingUp, Users2 } from "lucide-react";
import { LeadDetailRow } from "@/components/leads/LeadDetailRow";

const currency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
const number = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

const TYPE_STYLE: Record<string, string> = {
  "Кросс-продажа": "bg-sky-100 text-sky-700 hover:bg-sky-100",
  "Потенциал роста": "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  "Сезонная допродажа": "bg-amber-100 text-amber-700 hover:bg-amber-100",
  "Предложение остатков": "bg-violet-100 text-violet-700 hover:bg-violet-100",
};

const FILTERS = ["Все", "Кросс-продажа", "Потенциал роста", "Сезонная допродажа", "Предложение остатков"] as const;
const PAGE_SIZE = 20;

function useDebounced<T>(value: T, delay = 350): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setD(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return d;
}

export default function Leads() {
  const [type, setType] = useState<(typeof FILTERS)[number]>("Все");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const search = useDebounced(searchInput);

  const { data, isLoading } = useLeads({
    lead_type: type !== "Все" ? type : undefined,
    search: search || undefined,
  });

  useEffect(() => {
    setPage(0);
  }, [type, search]);

  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = items.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    (data?.by_type ?? []).forEach((t) => map.set(t.lead_type, t.count));
    return map;
  }, [data]);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground font-display sm:text-3xl">
            <Lightbulb className="h-7 w-7 text-primary" />
            Лиды
          </h1>
          <p className="mt-1 text-muted-foreground">
            Потенциальные продажи, выявленные из реализаций: кому и что можно продать
            {data?.season_label ? ` · сезон ${data.season_label}` : ""}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Всего лидов"
            value={number.format(data?.total_leads ?? 0)}
            subtitle="Найденных возможностей"
            icon={Target}
          />
          <StatsCard
            title="Общий потенциал"
            value={currency.format(data?.total_potential ?? 0)}
            subtitle="Оценка допвыручки"
            icon={TrendingUp}
          />
          <StatsCard
            title="Проанализировано"
            value={number.format(data?.buyers_analyzed ?? 0)}
            subtitle="Активных покупателей"
            icon={Users2}
          />
          <StatsCard
            title="Типы лидов"
            value={number.format(data?.by_type?.length ?? 0)}
            subtitle="Кросс / рост / сезон"
            icon={Sparkles}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {(data?.by_type ?? []).map((t) => (
            <Card key={t.lead_type}>
              <CardContent className="flex items-center justify-between py-5">
                <div>
                  <Badge className={TYPE_STYLE[t.lead_type] ?? ""} variant="secondary">
                    {t.lead_type}
                  </Badge>
                  <p className="mt-2 text-2xl font-bold">{number.format(t.count)}</p>
                  <p className="text-xs text-muted-foreground">лидов</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Потенциал</p>
                  <p className="text-lg font-semibold">{compact.format(t.potential)} ₸</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="gap-4">
            <CardTitle className="text-lg">Список лидов</CardTitle>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <Button
                    key={f}
                    variant={type === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setType(f)}
                  >
                    {f}
                    {f !== "Все" && typeCounts.has(f) ? (
                      <span className="ml-1.5 text-xs opacity-70">{number.format(typeCounts.get(f) ?? 0)}</span>
                    ) : null}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Поиск по компании или БИН"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="lg:w-72"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Компания</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Предложить</TableHead>
                    <TableHead className="text-right">Потенциал</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead className="min-w-[260px]">Почему</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Загрузка…
                      </TableCell>
                    </TableRow>
                  ) : pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Лидов не найдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((l, i) => (
                      <LeadDetailRow key={`${l.bin_iin}-${l.lead_type}-${l.category}-${i}`} lead={l} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                {items.length > 0
                  ? `Показано ${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, items.length)} из ${number.format(items.length)}`
                  : "0 лидов"}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  Назад
                </Button>
                <span className="text-sm text-muted-foreground">{safePage + 1} / {pageCount}</span>
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
